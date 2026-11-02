import csv
import hashlib
import json
from pathlib import Path
import subprocess

import librosa
import numpy as np
from scipy.ndimage import uniform_filter1d
from scipy.signal import find_peaks


root = Path(__file__).resolve().parent
work = root.parent / ".agent" / "work"
work.mkdir(parents=True, exist_ok=True)
audio, lrc = root / "嘉宾.m4a", root / "嘉宾.lrc"
wav = work / "jiabin.wav"
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-map", "0:a:0",
     "-ac", "1", "-ar", "22050", "-c:a", "pcm_f32le", str(wav)], check=True,
)
probe = json.loads(subprocess.check_output(
    ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_streams",
     "-show_format", "-of", "json", str(audio)], text=True,
))
sr, hop = 22050, 512
y, actual_sr = librosa.load(wav, sr=None)
duration = len(y) / sr
assert actual_sr == sr and len(y) > 0 and np.isfinite(y).all()
lines = []
for number, raw in enumerate(lrc.read_text(encoding="utf-8").splitlines(), 1):
    stamp, text = raw.split("]", 1)
    minute, second = stamp.removeprefix("[").split(":")
    lines.append({"line": number, "time": int(minute) * 60 + float(second), "text": text})
lt = np.array([line["time"] for line in lines])
assert len(lines) == 46 and np.all(np.diff(lt) > 0)
assert 0 < lt[0] < lt[-1] < duration
assert [line["text"] for line in lines] == [
    text for text in probe["format"]["tags"]["lyrics"].splitlines() if text
]

envelopes = {
    "full_median": librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median),
    "full_mean": librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.mean),
}
_, percussion = librosa.effects.hpss(y)
envelopes["percussive_median"] = librosa.onset.onset_strength(
    y=percussion, sr=sr, hop_length=hop, aggregate=np.median,
)
trials = []
for name, envelope in envelopes.items():
    for prior in (60, 80, 120):
        tempo, beats = librosa.beat.beat_track(
            onset_envelope=envelope, sr=sr, hop_length=hop, start_bpm=prior, units="time",
        )
        assert len(beats) > 0, f"{name}/{prior} 没有节拍"
        regional_fits = []
        for start, end in ((25, 110), (58, 105), (135, 220), (249, 285)):
            mask = (beats >= start) & (beats < end)
            slope, offset = np.polyfit(np.arange(len(beats))[mask], beats[mask], 1)
            residual = beats[mask] - (slope * np.arange(len(beats))[mask] + offset)
            regional_fits.append({"start": start, "end": end, "bpm": float(60 / slope),
                                  "residual_rms": float(np.sqrt(np.mean(residual ** 2)))})
        trials.append({"envelope": name, "start_bpm": prior,
                       "tempo": float(np.asarray(tempo).item()), "count": len(beats),
                       "first": float(beats[0]), "last": float(beats[-1]), "regional_fits": regional_fits})
        if name == "full_median" and prior == 120:
            double_beats = beats
phase_strengths = []
for phase in (0, 1):
    candidates = double_beats[phase::2]
    stable = candidates[(candidates >= 135) & (candidates < 285)]
    frames = librosa.time_to_frames(stable, sr=sr, hop_length=hop)
    phase_strengths.append(float(np.mean(envelopes["full_median"][frames])))
phase = int(np.argmax(phase_strengths))
selected = double_beats[phase::2]
assert len(selected) > 100 and np.isfinite(selected).all()
assert np.all(np.diff(selected) > 0) and 0 <= selected[0] < selected[-1] < duration
fits = []
for start, end in ((25, 300), (0, duration), (25, 110), (135, 220), (242, 300), (305, duration)):
    mask = (selected >= start) & (selected < end)
    indices = np.arange(len(selected))[mask]
    assert len(indices) > 2
    slope, offset = np.polyfit(indices, selected[mask], 1)
    residual = selected[mask] - (slope * indices + offset)
    fits.append({"start": start, "end": end, "count": len(indices), "bpm": float(60 / slope),
                 "residual_rms": float(np.sqrt(np.mean(residual ** 2)))})

times = librosa.times_like(envelopes["full_median"], sr=sr, hop_length=hop)
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
smooth = uniform_filter1d(rms, size=13, mode="nearest")
db = librosa.amplitude_to_db(smooth, ref=np.max(rms), top_db=None)
quiet = {}
for threshold in (-20, -26, -32, -40, -50):
    edges = np.diff(np.r_[False, db < threshold, False].astype(int))
    quiet[str(threshold)] = [
        [round(float(times[start]), 6), round(min(end * hop / sr, duration), 6)]
        for start, end in zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1))
        if (end - start) * hop / sr >= 0.35
    ]
tail_onsets, last_candidates, rising_candidates = {}, {}, {}
for name, envelope in envelopes.items():
    peaks, _ = find_peaks(envelope, distance=round(0.15 * sr / hop),
                          prominence=float(np.percentile(envelope, 70)))
    tail = []
    for frame in peaks:
        if times[frame] < 280:
            continue
        before = rms[max(0, frame - 13):frame - 4]
        after = rms[frame:min(len(rms), frame + 9)]
        tail.append({"time": round(float(times[frame]), 6),
                     "strength": round(float(envelope[frame]), 6),
                     "rms_db": round(float(db[frame]), 3),
                     "rise_db": round(float(20 * np.log10((np.mean(after) + 1e-10) /
                                                          (np.mean(before) + 1e-10))), 3)})
    tail_onsets[name] = tail
    last_candidates[name] = {}
    rising_candidates[name] = {}
    for percentile in (90, 95, 97):
        threshold = float(np.percentile(envelope, percentile))
        strong = [event for event in tail if event["strength"] >= threshold and event["rms_db"] > -35]
        last_candidates[name][str(percentile)] = {
            "threshold": threshold, "last": strong[-1] if strong else None,
        }
        rising = [event for event in strong if event["rise_db"] >= 3]
        rising_candidates[name][str(percentile)] = rising[-1] if rising else None

mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
structure = {}
for count in (12, 18):
    boundaries = librosa.segment.agglomerative(librosa.util.normalize(mfcc[1:], axis=1), count)
    structure[str(count)] = librosa.frames_to_time(boundaries, sr=sr, hop_length=hop).round(6).tolist()
sections = []
edges = [("前奏", 0), ("主歌一", lt[0]), ("预副歌一", lt[4]),
         ("副歌一 A", lt[6]), ("副歌一 B", lt[10]), ("副歌一尾段", lt[12]),
         ("间奏（MFCC 转折候选）", 111.966621),
         ("主歌二", lt[16]), ("预副歌二", lt[20]), ("副歌二 A", lt[22]),
         ("副歌二 B", lt[26]), ("桥段", lt[32]), ("终副歌 A", lt[34]),
         ("终副歌 B", lt[38]), ("收束人声", lt[42]),
         ("尾奏（低能量后强起音候选）", 310.195374)]
for index, (name, start) in enumerate(edges):
    end = edges[index + 1][1] if index + 1 < len(edges) else duration
    clip = rms[(times >= start) & (times < end)]
    nearest = float(selected[np.argmin(np.abs(selected - start))])
    sections.append({"name": name, "start": float(start), "end": float(end),
                     "nearest_beat": nearest, "beat_delta": nearest - start,
                     "rms_db": float(20 * np.log10(np.sqrt(np.mean(clip ** 2)) / np.max(rms)))})
for line in lines:
    nearest = float(selected[np.argmin(np.abs(selected - line["time"]))])
    line["nearest_beat"] = round(nearest, 6)
    line["beat_delta"] = round(nearest - line["time"], 6)
result = {
    "audio": audio.name, "sha256": hashlib.sha256(audio.read_bytes()).hexdigest(),
    "lrc_sha256": hashlib.sha256(lrc.read_bytes()).hexdigest(),
    "librosa": librosa.__version__, "sr": sr, "hop_length": hop,
    "duration_decoded": duration, "source_stream": probe["streams"][0],
    "source_tags": {key: value for key, value in probe["format"]["tags"].items() if key != "lyrics"},
    "selected_method": "full_median/start_bpm=120, every other detected pulse; phase chosen by mean onset strength in 135–285s",
    "selected_phase": phase, "phase_strengths": phase_strengths, "trials": trials, "fits": fits,
    "beat_count": len(selected), "beats": [round(float(t), 6) for t in selected],
    "lines": lines, "quiet_intervals_relative_db": quiet,
    "quiet_method": "RMS frame=2048, 13-frame moving average, ref=unsmoothed peak RMS, min_duration=0.35s",
    "tail_onsets": tail_onsets, "last_accent_candidates": last_candidates,
    "last_rising_accent_candidates_min_3db": rising_candidates,
    "accent_method": "peaks after 280s, distance>=0.15s, prominence>=global p70, strength>=global p90/p95/p97, smoothed RMS>-35dB relative",
    "mfcc_structure_candidates": structure, "sections": sections,
}
(root / "音频测量.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
with (root / "节拍点.csv").open("w", encoding="utf-8", newline="") as stream:
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(["beat_index", "seconds", "mm_ss"])
    for number, seconds in enumerate(selected, 1):
        writer.writerow([number, f"{seconds:.6f}", f"{int(seconds // 60):02d}:{seconds % 60:06.3f}"])
with (root / "节拍点.csv").open(encoding="utf-8", newline="") as stream:
    rows = list(csv.DictReader(stream))
assert len(rows) == len(selected)
assert np.allclose([float(row["seconds"]) for row in rows], selected, atol=0.000001)
print(json.dumps({key: value for key, value in result.items()
                  if key not in ("beats", "lines", "source_stream", "source_tags", "tail_onsets")},
                 ensure_ascii=False, indent=2))
