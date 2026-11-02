import json
import re
import warnings
from pathlib import Path

import librosa
import numpy as np

HERE = Path(__file__).resolve().parent
SONG = HERE.parent / "嘉宾.m4a"
LRC = HERE.parent / "嘉宾.lrc"
SR = 22050
HOP = 220
SONG_SECONDS = 333.677
VOICE_MIN_HZ = 130
VOICE_MAX_HZ = 700
MIN_RUN_SECONDS = 0.12
SEARCH_BEFORE = 0.6
SEARCH_AFTER = 1.2
BAND = (300, 3400)

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
    f0, voiced, _ = librosa.pyin(center, fmin=VOICE_MIN_HZ, fmax=VOICE_MAX_HZ, sr=SR, frame_length=2048, hop_length=HOP)
    frame = HOP / SR
    runs, begin = [], None
    for i, on in enumerate(voiced):
        if on and begin is None:
            begin = i
        if not on and begin is not None:
            if (i - begin) * frame >= MIN_RUN_SECONDS:
                runs.append((begin * frame, i * frame))
            begin = None
    if begin is not None:
        runs.append((begin * frame, len(voiced) * frame))
    return runs


# 音高跟踪测不到句首时的备用估计：中置声道人声频段能量上升最快的位置。
def band_onset(center):
    spectrum = np.abs(librosa.stft(center, n_fft=2048, hop_length=HOP)) ** 2
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    energy = spectrum[(freqs >= BAND[0]) & (freqs <= BAND[1])].sum(axis=0)
    level = librosa.power_to_db(energy + 1e-10, ref=np.max)
    smooth = np.convolve(level, np.ones(5) / 5, mode="same")
    rise = np.maximum(0, smooth[8:] - smooth[:-8])
    return np.concatenate([np.zeros(8), rise])


def measure(lines, runs, rise):
    frame = HOP / SR
    rows = []
    for i, line in enumerate(lines):
        limit = lines[i + 1]["start"] if i + 1 < len(lines) else SONG_SECONDS
        low, high = line["start"] - SEARCH_BEFORE, min(line["start"] + SEARCH_AFTER, limit - 0.05)
        inside = [r for r in runs if r[1] > line["start"] and r[0] < limit - 0.05]
        onset = next((r[0] for r in runs if low <= r[0] <= high), None)
        a, b = int(low / frame), int(high / frame)
        peak = a + int(np.argmax(rise[a:b]))
        rows.append({"line": i + 1, "text": line["text"], "lrc": line["start"],
                     "pitchOnset": None if onset is None else round(onset, 3),
                     "pitchOffset": None if onset is None else round(onset - line["start"], 3),
                     "bandOnset": round(peak * frame, 3), "bandOffset": round(peak * frame - line["start"], 3),
                     "voiceEnd": round(min(inside[-1][1], limit), 3) if inside else None, "nextLrc": round(limit, 3)})
    return rows


def main():
    raw, _ = librosa.load(SONG, sr=SR, mono=False)
    center = center_channel(raw)
    rows = measure(read_lrc(), voice_runs(center), band_onset(center))
    doc = {"method": "声像中央提取后：pyin 跟踪 130–700 Hz 音高；300–3400 Hz 能量上升作备用。不是人声分离或 ASR，伴奏旋律可能混入", "lines": rows}
    (HERE / "人声测量.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for r in rows:
        print(r["line"], r["lrc"], r["pitchOffset"], r["bandOffset"], r["voiceEnd"], r["nextLrc"], r["text"])


main()
