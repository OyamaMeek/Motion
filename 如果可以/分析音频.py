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
audio, lrc = root / "如果可以.m4a", root / "如果可以.lrc"
wav = work / "ruguokeyi.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-map", "0:a:0",
                "-ac", "1", "-ar", "22050", "-c:a", "pcm_f32le", str(wav)], check=True)
probe = json.loads(subprocess.check_output(
    ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_streams",
     "-show_format", "-of", "json", str(audio)], text=True))
sr, hop = 22050, 512
y, actual_sr = librosa.load(wav, sr=None)
duration = len(y) / sr
assert actual_sr == sr and len(y) > 0 and np.isfinite(y).all()
lines = []
for number, raw in enumerate(lrc.read_text(encoding="utf-8").splitlines(), 1):
    stamp, text = raw.split("]", 1)
    minute, second = stamp[1:].split(":")
    lines.append({"line": number, "time": int(minute) * 60 + float(second), "text": text})
lt = np.array([line["time"] for line in lines])
assert len(lines) == 35 and np.all(np.diff(lt) > 0) and 0 < lt[0] < lt[-1] < duration
assert [line["text"] for line in lines] == [
    text for text in probe["format"]["tags"]["lyrics"].splitlines() if text]
envelopes = {
    "full_mean": librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop),
    "full_median": librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median),
}
_, percussion = librosa.effects.hpss(y)
envelopes["percussive_median"] = librosa.onset.onset_strength(
    y=percussion, sr=sr, hop_length=hop, aggregate=np.median)
trials = []
for name, envelope in envelopes.items():
    for prior in (60, 80, 120, 160):
        tempo, beats = librosa.beat.beat_track(
            onset_envelope=envelope, sr=sr, hop_length=hop, start_bpm=prior, units="time")
        assert len(beats) > 100 and np.all(np.diff(beats) > 0)
        fits = []
        for start, end in ((20, 245), (52, 77), (122, 170), (199, 245)):
            indices = np.flatnonzero((beats >= start) & (beats < end))
            slope, offset = np.polyfit(indices, beats[indices], 1)
            residual = beats[indices] - (slope * indices + offset)
            fits.append({"start": start, "end": end, "bpm": float(60 / slope),
                         "residual_rms": float(np.sqrt(np.mean(residual ** 2)))})
        trials.append({"envelope": name, "start_bpm": prior,
                       "tempo": float(np.asarray(tempo).item()), "count": len(beats),
                       "first": float(beats[0]), "last": float(beats[-1]), "fits": fits})
        if name == "full_mean" and prior == 80:
            selected, selected_fits = beats, fits
assert 0 <= selected[0] < selected[-1] < duration and np.isfinite(selected).all()
times = librosa.times_like(envelopes["full_mean"], sr=sr, hop_length=hop)
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
db = librosa.amplitude_to_db(uniform_filter1d(rms, size=13, mode="nearest"),
                             ref=np.max(rms), top_db=None)
quiet = {}
for threshold in (-26, -32, -40, -50):
    edges = np.diff(np.r_[False, db < threshold, False].astype(int))
    quiet[str(threshold)] = [
        [round(float(times[a]), 6), round(min(b * hop / sr, duration), 6)]
        for a, b in zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1))
        if (b - a) * hop / sr >= 0.35]
tail_onsets, last_accents = {}, {}
for name, envelope in envelopes.items():
    peaks, _ = find_peaks(envelope, distance=round(0.15 * sr / hop),
                          prominence=float(np.percentile(envelope, 70)))
    tail = []
    for frame in peaks:
        if times[frame] < 240:
            continue
        before, after = rms[frame - 13:frame - 4], rms[frame:frame + 9]
        tail.append({"time": round(float(times[frame]), 6),
                     "strength": float(envelope[frame]), "rms_db": float(db[frame]),
                     "rise_db": float(20 * np.log10((np.mean(after) + 1e-10) /
                                                    (np.mean(before) + 1e-10)))})
    tail_onsets[name], last_accents[name] = tail, {}
    for percentile in (90, 95, 97):
        threshold = float(np.percentile(envelope, percentile))
        candidates = [event for event in tail if event["strength"] >= threshold
                      and event["rms_db"] > -35 and event["rise_db"] >= 3]
        last_accents[name][str(percentile)] = {
            "threshold": threshold, "last": candidates[-1] if candidates else None}
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
structure = {}
for count in (12, 18):
    boundaries = librosa.segment.agglomerative(librosa.util.normalize(mfcc[1:], axis=1), count)
    structure[str(count)] = librosa.frames_to_time(boundaries, sr=sr, hop_length=hop).round(6).tolist()
edges = [("前奏", 0), ("主歌一", lt[0]), ("预副歌一", lt[4]),
         ("副歌一", lt[6]), ("副歌尾句、尾腔及过门", lt[10]),
         ("主歌二", lt[11]), ("预副歌二", lt[13]),
         ("副歌二 A", lt[15]), ("副歌二 B", lt[19]), ("桥段", lt[23]),
         ("终副歌 A", lt[27]), ("终副歌 B", lt[31]),
         ("尾奏（MFCC 转折候选）", 250.868390)]
sections = []
for index, (name, start) in enumerate(edges):
    end = edges[index + 1][1] if index + 1 < len(edges) else duration
    clip = rms[(times >= start) & (times < end)]
    nearest = float(selected[np.argmin(np.abs(selected - start))])
    sections.append({"name": name, "start": float(start), "end": float(end),
                     "nearest_beat": nearest, "beat_delta": nearest - start,
                     "rms_db": float(20 * np.log10(np.sqrt(np.mean(clip ** 2)) / np.max(rms)))})
assert all(s["start"] < s["end"] for s in sections)
for line in lines:
    nearest = float(selected[np.argmin(np.abs(selected - line["time"]))])
    line.update(nearest_beat=round(nearest, 6), beat_delta=round(nearest - line["time"], 6))
result = {
    "audio": audio.name, "sha256": hashlib.sha256(audio.read_bytes()).hexdigest(),
    "lrc_sha256": hashlib.sha256(lrc.read_bytes()).hexdigest(), "librosa": librosa.__version__,
    "sr": sr, "hop_length": hop, "duration_decoded": duration,
    "source_stream": probe["streams"][0],
    "source_tags": {k: v for k, v in probe["format"]["tags"].items() if k != "lyrics"},
    "selected_method": "full_mean/start_bpm=80; no synthetic extension", "trials": trials,
    "fits": selected_fits, "beat_count": len(selected), "beats": selected.round(6).tolist(),
    "lines": lines, "sections": sections, "quiet_intervals_relative_db": quiet,
    "quiet_method": "RMS frame=2048; 13-frame mean; ref=unsmoothed peak RMS; min_duration=0.35s",
    "tail_onsets": tail_onsets, "last_accent_candidates": last_accents,
    "accent_method": "after 240s; peak distance>=0.15s; prominence>=global p70; strength>=global p90/95/97; RMS>-35dB; rise>=3dB",
    "mfcc_structure_candidates": structure,
}
(root / "音频测量.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
with (root / "节拍点.csv").open("w", encoding="utf-8", newline="") as stream:
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(["beat_index", "seconds", "mm_ss"])
    for number, seconds in enumerate(selected, 1):
        writer.writerow([number, f"{seconds:.6f}", f"{int(seconds // 60):02d}:{seconds % 60:06.3f}"])
print(json.dumps({"duration": duration, "beat_count": len(selected), "fits": selected_fits,
                  "trials": [{k: v for k, v in t.items() if k != "fits"} for t in trials],
                  "quiet": quiet, "last_accents": last_accents, "mfcc": structure},
                 ensure_ascii=False, indent=2))
