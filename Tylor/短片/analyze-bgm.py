import json
import sys

import librosa
import numpy as np

# 测量 bgm：拍长与第一拍（librosa 拍点做线性拟合）、小节首拍相位（200 Hz 以下起音强度按 4 拍相位求和）、
# 每小节能量、全曲调性（Krumhansl 调性轮廓与平均 chroma 的相关）、每小节和弦（三和弦模板）。
# 用法：.agent/venv/bin/python Tylor/短片/analyze-bgm.py bgm.mp3 Tylor/短片/bgm.json

src, dst = sys.argv[1], sys.argv[2]
y, sr = librosa.load(src, sr=22050, mono=True)
_, frames = librosa.beat.beat_track(y=y, sr=sr, start_bpm=113, tightness=300, units="frames")
times = librosa.frames_to_time(frames, sr=sr)
k = np.arange(len(times))
period, first = np.polyfit(k, times, 1)
residual = times - (first + period * k)

spec = np.abs(librosa.stft(y))
freqs = librosa.fft_frequencies(sr=sr)
low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(spec[freqs < 200], ref=np.max), sr=sr)
phase_strength = [float(low[frames[p::4]].sum()) for p in range(4)]
phase = int(np.argmax(phase_strength))
first_bar = first + phase * period

rms = librosa.feature.rms(y=y)[0]
rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
bars = int((len(y) / sr - first_bar) // (4 * period))
bar_energy = []
for b in range(bars):
    t0 = first_bar + 4 * b * period
    m = (rms_t >= t0) & (rms_t < t0 + 4 * period)
    bar_energy.append(round(float(rms[m].mean()), 4))

chroma = librosa.feature.chroma_cqt(y=librosa.effects.harmonic(y), sr=sr)
chroma_t = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr)
major = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
minor = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
mean = chroma.mean(axis=1)
scores = [(float(np.corrcoef(np.roll(prof, t), mean)[0, 1]), t, mode) for mode, prof in (("major", major), ("minor", minor)) for t in range(12)]
key_score, tonic, mode = max(scores)

names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
chords = []
for b in range(bars):
    t0 = first_bar + 4 * b * period
    m = (chroma_t >= t0) & (chroma_t < t0 + 4 * period)
    c = chroma[:, m].mean(axis=1)
    best = max(((float(c[r] + c[(r + third) % 12] + c[(r + 7) % 12]), r, q) for r in range(12) for third, q in ((4, ""), (3, "m"))))
    chords.append({"root": best[1], "name": names[best[1]] + best[2]})

out = {
    "source": src,
    "duration": round(len(y) / sr, 3),
    "period": float(period),
    "bpm": round(60 / float(period), 3),
    "firstBeat": float(first),
    "downbeatPhase": phase,
    "firstBar": float(first_bar),
    "beatResidualMs": {"std": round(float(residual.std() * 1000), 1), "max": round(float(np.abs(residual).max() * 1000), 1)},
    "key": {"tonic": tonic, "name": names[tonic] + (" minor" if mode == "minor" else " major"), "score": round(key_score, 3)},
    "barEnergy": bar_energy,
    "barChords": chords,
}
with open(dst, "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in out.items() if k not in ("barEnergy", "barChords")}, ensure_ascii=False))
print(" ".join(f"{i}:{c['name']}:{e}" for i, (c, e) in enumerate(zip(chords, bar_energy))))
