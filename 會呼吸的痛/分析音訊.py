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
audio = root / "會呼吸的痛.m4a"
lrc = root / "會呼吸的痛.lrc"
wav = work / "song.wav"
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-map", "0:a:0",
     "-ac", "1", "-ar", "22050", "-c:a", "pcm_f32le", str(wav)],
    check=True,
)
sr, hop = 22050, 512
y, actual_sr = librosa.load(wav, sr=None)
assert actual_sr == sr and len(y) > 0 and np.isfinite(y).all()
duration = len(y) / sr
lines = []
for number, line in enumerate(lrc.read_text(encoding="utf-8").splitlines(), 1):
    stamp, text = line.split("]", 1)
    minute, second = stamp.removeprefix("[").split(":")
    lines.append({"line": number, "time": int(minute) * 60 + float(second), "text": text})
lt = np.array([line["time"] for line in lines])
assert len(lines) == 37 and np.all(np.diff(lt) > 0)
assert 0 <= lt[0] < lt[-1] < duration

env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median)
_, percussion = librosa.effects.hpss(y)
env_p = librosa.onset.onset_strength(y=percussion, sr=sr, hop_length=hop, aggregate=np.median)
trials = []
for name, envelope in (("full", env), ("percussive", env_p)):
    for prior in (60, 80, 120):
        tempo, beats = librosa.beat.beat_track(
            onset_envelope=envelope, sr=sr, hop_length=hop,
            start_bpm=prior, units="time",
        )
        trials.append({"envelope": name, "start_bpm": prior,
                       "tempo": float(np.asarray(tempo).item()), "count": len(beats),
                       "first": float(beats[0]), "last": float(beats[-1])})
        if name == "full" and prior == 120:
            selected = beats
assert len(selected) > 100 and np.isfinite(selected).all()
assert np.all(np.diff(selected) > 0) and 0 <= selected[0] < selected[-1] < duration
fit_rows = []
for start, end in ((20, 240), (0, duration), (20, 100), (100, 180), (180, 240), (240, duration)):
    mask = (selected >= start) & (selected < end)
    indices = np.arange(len(selected))[mask]
    slope, offset = np.polyfit(indices, selected[mask], 1)
    residual = selected[mask] - (slope * indices + offset)
    fit_rows.append({"start": start, "end": end, "count": len(indices),
                     "bpm": float(60 / slope), "residual_rms": float(np.sqrt(np.mean(residual ** 2)))})

times = librosa.times_like(env, sr=sr, hop_length=hop)
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
smooth = uniform_filter1d(rms, size=13, mode="nearest")
db = librosa.amplitude_to_db(smooth, ref=np.max(rms))
quiet = {}
for threshold in (-20, -26, -32, -40):
    mask = db < threshold
    edges = np.diff(np.r_[False, mask, False].astype(int))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
    quiet[str(threshold)] = [
        [round(float(times[start]), 3), round(min(end * hop / sr, duration), 3)]
        for start, end in zip(starts, ends) if (end - start) * hop / sr >= 0.35
    ]

peaks, _ = find_peaks(env, distance=round(0.15 * sr / hop), prominence=float(np.percentile(env, 70)))
threshold = float(np.percentile(env, 95))
tail = []
for frame in peaks:
    if times[frame] < 240:
        continue
    before = rms[max(0, frame - 13):max(1, frame - 4)]
    after = rms[frame:min(len(rms), frame + 9)]
    tail.append({"time": round(float(times[frame]), 3), "strength": round(float(env[frame]), 4),
                 "rms_db": round(float(db[frame]), 3),
                 "rise_db": round(float(20 * np.log10((np.mean(after) + 1e-10) / (np.mean(before) + 1e-10))), 3)})
strong = [event for event in tail if event["strength"] >= threshold]
assert strong, "未找到尾段强起音，需人工判定"
last_accent = strong[-1]
accent_sensitivity = {}
for percentile in (90, 95, 97):
    candidates = [event for event in tail if event["strength"] >= np.percentile(env, percentile)]
    accent_sensitivity[str(percentile)] = candidates[-1]["time"] if candidates else None
mean_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.mean)
mean_peaks, _ = find_peaks(mean_env, distance=round(0.15 * sr / hop), prominence=float(np.percentile(mean_env, 70)))
mean_strong = [int(frame) for frame in mean_peaks if times[frame] > 250 and mean_env[frame] >= np.percentile(mean_env, 95)]

for line in lines:
    nearest = float(selected[np.argmin(np.abs(selected - line["time"]))])
    line["nearest_beat"] = round(nearest, 6)
    line["beat_delta"] = round(nearest - line["time"], 6)
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
structure = {}
for count in (10, 14):
    boundaries = librosa.segment.agglomerative(librosa.util.normalize(mfcc[1:], axis=1), count)
    structure[str(count)] = librosa.frames_to_time(boundaries, sr=sr, hop_length=hop).round(3).tolist()
energy = []
section_edges = [0, lt[0], lt[4], lt[6], lt[14], lt[18], lt[20], lt[28], lt[36], duration]
for start, end in zip(section_edges, section_edges[1:]):
    clip = rms[(times >= start) & (times < end)]
    energy.append({"start": start, "end": end,
                   "rms_db": round(float(20 * np.log10(np.sqrt(np.mean(clip ** 2)) / np.max(rms))), 3)})

result = {
    "audio": audio.name, "sha256": hashlib.sha256(audio.read_bytes()).hexdigest(),
    "lrc_sha256": hashlib.sha256(lrc.read_bytes()).hexdigest(),
    "librosa": librosa.__version__, "sr": sr, "hop_length": hop, "duration_decoded": duration,
    "trials": trials, "fits": fit_rows, "beat_count": len(selected),
    "beats": [round(float(t), 6) for t in selected], "lines": lines,
    "quiet_intervals_relative_db": quiet, "onset_p95": threshold,
    "tail_onsets": tail, "last_accent_candidate": last_accent, "section_energy": energy,
    "mfcc_structure_candidates": structure,
    "last_accent_by_percentile": accent_sensitivity,
    "mean_envelope_strong_after_250": [round(float(times[frame]), 3) for frame in mean_strong],
}
(root / "音訊測量.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
with (root / "節拍點.csv").open("w", encoding="utf-8", newline="") as stream:
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(["beat_index", "seconds", "mm_ss"])
    for number, seconds in enumerate(selected, 1):
        writer.writerow([number, f"{seconds:.6f}", f"{int(seconds // 60):02d}:{seconds % 60:06.3f}"])
with (root / "節拍點.csv").open(encoding="utf-8", newline="") as stream:
    rows = list(csv.DictReader(stream))
assert len(rows) == len(selected)
assert np.allclose([float(row["seconds"]) for row in rows], selected, atol=0.000001)
summary = {key: value for key, value in result.items() if key not in ("beats", "lines")}
print(json.dumps(summary, ensure_ascii=False, indent=2))
print("输入、LRC、节拍顺序与 CSV 一致性检查通过")
