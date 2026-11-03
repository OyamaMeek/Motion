import csv
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np
from sklearn.cluster import KMeans

video = Path(sys.argv[1])
work = Path(sys.argv[2])
out = video.parent
frames_dir = work / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)
FPS = 30.0


def ffmpeg_raw(args, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", *args, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)


def hexc(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", "fps=2", "-start_number", "0", str(frames_dir / "f%03d.png")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "22050", str(work / "audio.wav")], check=True)
n_samples = len(list(frames_dir.glob("f*.png")))

sample_offset = None
for off in range(15):
    probe = ffmpeg_raw(["-i", str(video), "-vf", f"select=eq(n\\,{38 * 15 + off})", "-frames:v", "1"], 1280, 720)[0]
    ref = ffmpeg_raw(["-i", str(frames_dir / "f038.png")], 1280, 720)[0]
    if np.abs(probe - ref).max() == 0:
        sample_offset = off
        break
if sample_offset is None:
    raise SystemExit("抽帧与源帧无法逐像素对应")

y, sr = librosa.load(work / "audio.wav", sr=22050, mono=True)
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
beats = librosa.frames_to_time(beat_frames, sr=sr)
_, perc = librosa.effects.hpss(y)
tempo_p, _ = librosa.beat.beat_track(onset_envelope=librosa.onset.onset_strength(y=perc, sr=sr), sr=sr)
tg = librosa.feature.tempogram(onset_envelope=onset_env, sr=sr)
ac = tg.mean(axis=1)
bpms = librosa.tempo_frequencies(tg.shape[0], sr=sr)
tempo_candidates = [[round(float(bpms[i]), 1), round(float(ac[i]), 3)] for i in np.argsort(ac)[::-1] if 50 < bpms[i] < 220][:6]
iv = np.diff(beats)
rms = librosa.feature.rms(y=y)[0]
rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
rms_sec = [round(float(rms[(rms_t >= s) & (rms_t < s + 1)].mean()), 4) for s in range(int(rms_t[-1]) + 1)]

W, H = 160, 90
frames = ffmpeg_raw(["-i", str(video), "-vf", f"scale={W}:{H}"], W, H)
diff = np.abs(frames[1:] - frames[:-1]).mean(axis=(1, 2, 3))


def hist(f):
    h, _ = np.histogramdd(f.reshape(-1, 3), bins=(8, 8, 8), range=((0, 256),) * 3)
    return h.ravel() / h.sum()


hists = np.array([hist(f) for f in frames])
hdiff = 0.5 * np.abs(hists[1:] - hists[:-1]).sum(axis=1)
grid8 = beats[0] + np.arange(-2, 2 * len(beats) + 4) * (iv.mean() / 2)
cuts = []
for i in range(len(diff)):
    lo, hi = max(0, i - 8), min(len(diff), i + 9)
    local = np.median(np.concatenate([diff[lo:i], diff[i + 1:hi]]))
    if diff[i] > max(18, 3.5 * local) and diff[i] == diff[lo:hi].max():
        t = (i + 1) / FPS
        j = int(np.argmin(np.abs(beats - t)))
        k = int(np.argmin(np.abs(grid8 - t)))
        cuts.append({
            "frame": i + 1, "seconds": round(t, 3), "mean_abs_diff": round(float(diff[i]), 1),
            "hist_change": round(float(hdiff[i]), 3), "scene_change": bool(hdiff[i] >= 0.5),
            "to_beat": round(float(t - beats[j]), 3), "to_eighth": round(float(t - grid8[k]), 3),
        })
major = [c for c in cuts if c["scene_change"]]
shot_lengths = np.diff([0.0] + [c["seconds"] for c in major] + [len(frames) / FPS])

flash_frames = []
small = ffmpeg_raw(["-i", str(video), "-vf", "scale=64:36"], 64, 36)
means = small.mean(axis=(1, 2))
for i in range(1, len(means) - 1):
    if np.abs(means[i] - means[i - 1]).max() > 60 and np.abs(means[i] - means[i + 1]).max() > 60:
        flash_frames.append({"frame": i, "seconds": round(i / FPS, 3), "rgb": hexc(means[i])})

pix = frames[::15].reshape(-1, 3)
rng = np.random.default_rng(0)
km = KMeans(n_clusters=10, n_init=4, random_state=0).fit(pix[rng.choice(len(pix), 60000, replace=False)])
share = np.bincount(km.labels_, minlength=10) / len(km.labels_)
palette = sorted([{"hex": hexc(c), "share": round(float(s), 3)} for c, s in zip(km.cluster_centers_, share)], key=lambda d: -d["share"])

samples = [ffmpeg_raw(["-i", str(frames_dir / f"f{k:03d}.png"), "-vf", "scale=320:180"], 320, 180)[0] for k in range(n_samples)]
acc, owner = [], []
for k, im in enumerate(samples):
    px = im.reshape(-1, 3)
    mx, mn = px.max(1), px.min(1)
    m = ((mx - mn) / np.maximum(mx, 1) > 0.45) & (mx > 60)
    acc.append(px[m])
    owner.append(np.full(m.sum(), k))
acc, owner = np.concatenate(acc), np.concatenate(owner)
km2 = KMeans(n_clusters=6, n_init=4, random_state=0).fit(acc)
accents = []
for c in np.argsort(-np.bincount(km2.labels_)):
    sel = km2.labels_ == c
    ks = np.bincount(owner[sel], minlength=n_samples)
    accents.append({
        "hex": hexc(km2.cluster_centers_[c]), "share_of_saturated": round(float(sel.mean()), 3),
        "sample_frames": int((ks > 50).sum()),
        "top_seconds": [round(0.5 * k + sample_offset / FPS, 3) for k in np.argsort(-ks)[:5] if ks[k] > 0],
    })

regions = {
    "米白纸底": (100, [(0, 0, 40, 30), (280, 150, 320, 180)]),
    "暖米纸": (3, [(0, 0, 40, 30), (280, 150, 320, 180)]),
    "暗场": (112, [(0, 0, 40, 30), (280, 150, 320, 180)]),
    "竹林雾中景": (44, [(120, 110, 200, 140)]),
    "竹林雨夜地面": (30, [(20, 150, 300, 178)]),
    "海面天空": (60, [(0, 10, 320, 60)]),
    "海面水": (60, [(0, 130, 320, 178)]),
    "荔枝暖底": (70, [(100, 130, 140, 170)]),
    "月旁暗红云": (88, [(60, 30, 100, 60)]),
    "月夜海水": (88, [(0, 140, 60, 178)]),
    "橙色闪底": (50, [(0, 150, 40, 178)]),
}
scene_colors = {}
for name, (k, boxes) in regions.items():
    px = np.concatenate([samples[k][y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in boxes])
    scene_colors[name] = {"hex": hexc(np.median(px, 0)), "sample_seconds": round(0.5 * k + sample_offset / FPS, 3)}

result = {
    "input": {"file": video.name, "sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "frames": int(len(frames)), "fps": FPS, "seconds": round(len(frames) / FPS, 3)},
    "sampling": {"step_seconds": 0.5, "count": n_samples, "source_frame_offset": sample_offset, "note": f"第 k 张抽帧逐像素等于源帧 15k+{sample_offset}，时间 0.5k+{sample_offset / FPS:.3f} 秒"},
    "tempo": {
        "librosa_version": librosa.__version__, "beat_track_bpm": round(float(np.atleast_1d(tempo)[0]), 1),
        "percussive_bpm": round(float(np.atleast_1d(tempo_p)[0]), 1), "tempogram_candidates": tempo_candidates,
        "beat_interval_mean": round(float(iv.mean()), 4), "beat_interval_std": round(float(iv.std()), 4),
        "bpm_from_mean_interval": round(float(60 / iv.mean()), 1), "beat_count": int(len(beats)),
        "bpm_per_10s": [[s, round(float(60 / iv[(beats[1:] >= s) & (beats[1:] < s + 10)].mean()), 1)] for s in range(0, 80, 10)],
    },
    "rms_per_second": rms_sec,
    "cuts": {"candidates": len(cuts), "scene_changes": len(major), "shot_lengths_between_scene_changes": [round(float(v), 2) for v in shot_lengths], "median_shot_length": round(float(np.median(shot_lengths)), 2), "max_abs_to_eighth": round(float(max(abs(c["to_eighth"]) for c in major)), 3)},
    "single_frame_flashes": flash_frames,
    "palette_global": palette,
    "accent_colors": accents,
    "scene_colors": scene_colors,
}
(out / "测量.json").write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
with open(out / "节拍点.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["beat_index", "seconds", "mm_ss"])
    for i, t in enumerate(beats, 1):
        w.writerow([i, f"{t:.3f}", f"{int(t // 60):02d}:{t % 60:06.3f}"])
with open(out / "切点.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(list(cuts[0].keys()))
    for c in cuts:
        w.writerow(list(c.values()))
print(json.dumps({k: result[k] for k in ("sampling", "tempo", "cuts", "single_frame_flashes")}, ensure_ascii=False, indent=1))
