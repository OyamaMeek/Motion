import json
import re
import warnings
from pathlib import Path

import librosa
import numpy as np

HERE = Path(__file__).resolve().parent
SONG = HERE.parent / "會呼吸的痛.m4a"
LRC = HERE.parent / "會呼吸的痛.lrc"
SR = 22050
HOP = 220
SONG_SECONDS = 273.043
FPS = 12
# 伴奏持续音落在 196 Hz 附近，人声主旋律在其上方。
VOICE_MIN_HZ = 205
MIN_RUN_SECONDS = 0.12

warnings.filterwarnings("ignore")


def read_lrc():
    lines = []
    for raw in LRC.read_text(encoding="utf-8").strip().splitlines():
        m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", raw)
        lines.append({"start": round(int(m[1]) * 60 + float(m[2]), 3), "text": m[3].strip()})
    return lines


def center_channel(stereo):
    left = librosa.stft(stereo[0], n_fft=2048, hop_length=HOP)
    right = librosa.stft(stereo[1], n_fft=2048, hop_length=HOP)
    keep = (np.abs(left + right) / (np.abs(left) + np.abs(right) + 1e-9) / 2) ** 4
    return librosa.istft((left + right) * keep, hop_length=HOP, length=stereo.shape[1])


def voice_runs(center):
    f0, voiced, _ = librosa.pyin(center, fmin=170, fmax=800, sr=SR, frame_length=2048, hop_length=HOP)
    sung = voiced & (np.nan_to_num(f0) >= VOICE_MIN_HZ)
    frame = HOP / SR
    runs, begin = [], None
    for i, on in enumerate(sung):
        if on and begin is None:
            begin = i
        if not on and begin is not None:
            if (i - begin) * frame >= MIN_RUN_SECONDS:
                runs.append((begin * frame, i * frame))
            begin = None
    if begin is not None:
        runs.append((begin * frame, len(sung) * frame))
    return runs


def measure(lines, runs):
    rows = []
    for i, line in enumerate(lines):
        limit = lines[i + 1]["start"] if i + 1 < len(lines) else SONG_SECONDS
        inside = [r for r in runs if r[1] > line["start"] - 0.5 and r[0] < limit - 0.05]
        onset = next((r[0] for r in inside if r[0] >= line["start"] - 0.5), None)
        rows.append({"line": i + 1, "text": line["text"], "lrc": line["start"],
                     "pitchOnset": None if onset is None else round(onset, 3),
                     "offset": None if onset is None else round(onset - line["start"], 3),
                     "pitchEnd": round(min(inside[-1][1], limit), 3) if inside else None, "nextLrc": round(limit, 3)})
    return rows


def write_energy(mono):
    rms = librosa.feature.rms(y=mono, frame_length=4096, hop_length=512)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=512)
    wanted = np.arange(int(np.ceil(SONG_SECONDS * FPS))) / FPS
    level = np.clip(np.interp(wanted, times, rms) / np.percentile(rms, 98), 0, 1)
    values = ",".join(str(int(v * 99)) for v in level)
    (HERE / "energy.js").write_text(f"// 由 vocal_measure.py 从原曲生成：每 1/{FPS} 秒的相对响度，0–99。\nexport const ENERGY = [{values}];\n", encoding="utf-8")


def main():
    raw, _ = librosa.load(SONG, sr=SR, mono=False)
    rows = measure(read_lrc(), voice_runs(center_channel(raw)))
    write_energy(librosa.to_mono(raw))
    doc = {"method": "声像中央提取后用 pyin 跟踪 205–800 Hz 音高；不是人声分离或 ASR，伴奏旋律可能混入", "lines": rows}
    (HERE / "人聲測量.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for r in rows:
        print(r["line"], r["lrc"], r["pitchOnset"], r["offset"], r["pitchEnd"], r["nextLrc"], r["text"])


main()
