import json
import sys

import librosa
import numpy as np

# 检查拉伸后的 bgm 单轨是否落在成片 0.5 秒的拍格上：
# 起音包络（hop 64，约 2.9 ms）按 0.5 秒折叠，峰值相位即整体偏移；200 Hz 以下起音按成片拍号的 4 拍相位求和，最强相位应为 0（小节首拍）。
# 用法：.agent/venv/bin/python Tylor/短片/bgm-grid.py bgm单轨.wav
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
hop = 64
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
t = np.arange(len(env)) * hop / sr
bins = np.zeros(200)
idx = (((t + 0.25) % 0.5) / 0.5 * len(bins)).astype(int) % len(bins)
np.add.at(bins, idx, env)
offset_ms = (np.argmax(bins) + 0.5) / len(bins) * 500 - 250

spec = np.abs(librosa.stft(y))
freqs = librosa.fft_frequencies(sr=sr)
low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(spec[freqs < 200], ref=np.max), sr=sr)
lt = librosa.frames_to_time(np.arange(len(low)), sr=sr)
beats = int(lt[-1] / 0.5)
phase = [0.0] * 4
for k in range(beats):
    i = int(np.argmin(np.abs(lt - k * 0.5)))
    phase[k % 4] += float(low[max(0, i - 2):i + 3].max())
print(json.dumps({"foldedOffsetMs": round(float(offset_ms), 1), "lowOnsetByBarPhase": [round(p, 2) for p in phase], "downbeatOnBar": int(np.argmax(phase)) == 0}))
