import json
import sys

import librosa
import numpy as np

# 检查剪辑后的 bgm 单轨：librosa 拍点到成片 0.5 秒拍格的偏差；小节首拍（低频起音最强的 4 拍相位）是否在成片小节首拍上；
# 接缝前后 4 拍的偏差。用法：.agent/venv/bin/python check-bgm-grid.py bgm单轨.wav 接缝拍号
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
seam = int(sys.argv[2])
_, beats = librosa.beat.beat_track(y=y, sr=sr, units="frames", tightness=400, start_bpm=120)
bt = librosa.frames_to_time(beats, sr=sr)
grid = np.round(bt / 0.5).astype(int)
off = (bt - grid * 0.5) * 1000
S = np.abs(librosa.stft(y))
freqs = librosa.fft_frequencies(sr=sr)
low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[freqs < 200]), sr=sr)
phase = [float(low[beats[grid % 4 == p]].mean()) for p in range(4)]
near = np.abs(grid - seam) <= 4
# 细测：hop 64（约 2.9 ms）的起音包络按 0.5 秒折叠，峰值相位就是 bgm 相对拍格的整体偏移
hop = 64
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
t = np.arange(len(env)) * hop / sr
bins = np.zeros(172)
for v, tt in zip(env, t):
    ph = ((tt + 0.25) % 0.5) - 0.25
    bins[int((ph + 0.25) / 0.5 * len(bins)) % len(bins)] += v
fold_ms = (np.argmax(bins) + 0.5) / len(bins) * 500 - 250
print(json.dumps({
    "foldedOffsetMs": round(float(fold_ms), 1),
    "beats": int(len(bt)),
    "offsetMsMedian": round(float(np.median(off)), 1),
    "offsetMsAbsP95": round(float(np.percentile(np.abs(off), 95)), 1),
    "offsetMsAbsMax": round(float(np.abs(off).max()), 1),
    "lowOnsetByFilmBarPhase": [round(v, 3) for v in phase],
    "downbeatOnFilmBar": int(np.argmax(phase)) == 0,
    "seamOffsetsMs": [[int(g), round(float(o), 1)] for g, o in zip(grid[near], off[near])],
}, indent=1))
