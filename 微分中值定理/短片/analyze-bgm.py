import json
import sys

import librosa
import numpy as np

# 测量 bgm.mp3：拍长与第一拍（线性拟合 librosa 拍点）、小节首拍相位（低频起音按 4 拍相位比较）、
# 每 8 拍的能量、每小节和弦（chroma 三和弦模板）。结果写入 bgm-analysis.json，配乐按它拉伸、剪辑和定和弦。
# 用法：.agent/venv/bin/python 微分中值定理/短片/analyze-bgm.py bgm.mp3 微分中值定理/短片/bgm-analysis.json

src, dst = sys.argv[1], sys.argv[2]
y, sr = librosa.load(src, sr=22050, mono=True)
_, beats = librosa.beat.beat_track(y=y, sr=sr, units="frames", tightness=400)
bt = librosa.frames_to_time(beats, sr=sr)
idx = np.arange(len(bt))
period, first = np.polyfit(idx, bt, 1)
resid = bt - (period * idx + first)

S = np.abs(librosa.stft(y))
freqs = librosa.fft_frequencies(sr=sr)
low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[freqs < 200]), sr=sr)
phase_low = [float(low[beats[p::4]].mean()) for p in range(4)]
downbeat_phase = int(np.argmax(phase_low))

rms = librosa.feature.rms(y=y)[0]
energy = []
for k in range(0, len(beats) - 8, 8):
    energy.append(round(float(rms[beats[k]:beats[k + 8]].mean()), 4))

names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
templates = []
for r in range(12):
    for q, iv in (("maj", (0, 4, 7)), ("min", (0, 3, 7))):
        t = np.zeros(12)
        for i in iv:
            t[(r + i) % 12] = 1
        templates.append((r, q, t / np.linalg.norm(t)))
y_h = librosa.effects.harmonic(y)
chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=512)
times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=512)
chords = []
k = downbeat_phase
while True:
    a, b = first + k * period, first + (k + 4) * period
    m = (times >= a) & (times < b)
    if not m.any():
        break
    c = chroma[:, m].mean(axis=1)
    c = c / (np.linalg.norm(c) + 1e-9)
    r, q, _ = max(templates, key=lambda t: float(t[2] @ c))
    chords.append({"root": r, "quality": q, "name": names[r] + ("m" if q == "min" else "")})
    k += 4

out = {
    "source": src,
    "duration": round(len(y) / sr, 4),
    "period": float(period),
    "bpm": 60 / float(period),
    "firstBeat": float(first),
    "beatResidualMsMax": round(float(np.abs(resid).max() * 1000), 1),
    "beatResidualMsStd": round(float(resid.std() * 1000), 1),
    "beatCount": int(len(bt)),
    "downbeatPhase": downbeat_phase,
    "lowOnsetByPhase": [round(v, 3) for v in phase_low],
    "energyPer8Beats": energy,
    "barChords": chords,
}
with open(dst, "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in out.items() if k not in ("energyPer8Beats", "barChords")}, ensure_ascii=False))
print(" ".join(f"{i}:{c['name']}" for i, c in enumerate(chords)))
