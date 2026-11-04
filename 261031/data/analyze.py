import json, re, sys
import numpy as np, librosa, scipy.signal as ss

path, lrc_path, out = sys.argv[1:4]
SR = 22050
HOP = 512
y_st, sr = librosa.load(path, sr=SR, mono=False)
y = librosa.to_mono(y_st)
dur = len(y) / sr
print("duration", round(dur, 3))

# --- tempo ---
y_h, y_p = librosa.effects.hpss(y)
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP, aggregate=np.median)
env_p = librosa.onset.onset_strength(y=y_p, sr=sr, hop_length=HOP, aggregate=np.median)
for name, e in [("full", env), ("perc", env_p)]:
    for prior in [60, 80, 120]:
        t, b = librosa.beat.beat_track(onset_envelope=e, sr=sr, hop_length=HOP, start_bpm=prior, units="time")
        ibi = np.diff(b)
        print(name, "start_bpm", prior, "tempo", np.round(t, 2), "n", len(b),
              "first", round(b[0], 2), "last", round(b[-1], 2),
              "median_ibi_bpm", round(60 / np.median(ibi), 2), "ibi_std", round(ibi.std(), 3))

ac = librosa.autocorrelate(env, max_size=int(8 * sr / HOP))
lags = np.arange(1, len(ac))
bpm = 60 * sr / HOP / lags
mask = (bpm > 40) & (bpm < 200)
pk, _ = ss.find_peaks(ac[1:][mask], prominence=np.max(ac[1:][mask]) * 0.02)
top = sorted(pk, key=lambda i: -ac[1:][mask][i])[:8]
print("autocorr peaks bpm", [round(float(bpm[mask][i]), 2) for i in top])
tg = librosa.feature.tempogram(onset_envelope=env, sr=sr, hop_length=HOP)
tf = librosa.tempo_frequencies(tg.shape[0], hop_length=HOP, sr=sr)
mean_tg = tg.mean(axis=1)
idx = [i for i in np.argsort(-mean_tg) if 40 < tf[i] < 200][:8]
print("tempogram top", [round(float(tf[i]), 1) for i in idx])

# --- lrc ---
lrc = []
for line in open(lrc_path, encoding="utf-8"):
    m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line.strip())
    if m:
        lrc.append((int(m[1]) * 60 + float(m[2]), m[3]))
print("lrc inter-line gaps", [round(lrc[i + 1][0] - lrc[i][0], 2) for i in range(len(lrc) - 1)])

# --- energy / vocal proxy (centre channel, vocal band) ---
S = np.abs(librosa.stft(y, hop_length=HOP))
freqs = librosa.fft_frequencies(sr=sr)
times = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=HOP)
rms = librosa.feature.rms(S=S, hop_length=HOP)[0]
db = librosa.amplitude_to_db(rms, ref=np.max(rms))
mid = (y_st[0] + y_st[1]) / 2
side = (y_st[0] - y_st[1]) / 2
S_m = np.abs(librosa.stft(mid, hop_length=HOP))
S_s = np.abs(librosa.stft(side, hop_length=HOP))
band = (freqs > 250) & (freqs < 4000)
centre = np.clip(S_m[band] - S_s[band], 0, None).sum(axis=0)
centre_h = librosa.feature.rms(y=librosa.effects.harmonic(mid), hop_length=HOP)[0]
print("mid/side rms ratio", round(float(np.sqrt((mid**2).mean()) / np.sqrt((side**2).mean())), 2))
flat = librosa.feature.spectral_flatness(S=S)[0]

def stat(a, b):
    i = (times >= a) & (times < b)
    return round(float(db[i].mean()), 1)

def sec(n, w=1.0):
    n_ = int(w * sr / HOP)
    return np.convolve(n, np.ones(n_) / n_, mode="same")

# per-5-second energy curve
curve = [(int(t), stat(t, t + 5)) for t in range(0, int(dur), 5)]
print("energy/5s", curve)

# quiet regions
sm = sec(db, 0.3)
for th in (-20, -26, -32, -40):
    q = sm < th
    reg, s = [], None
    for i, v in enumerate(q):
        if v and s is None:
            s = i
        if not v and s is not None:
            if times[i] - times[s] >= 0.35:
                reg.append((round(float(times[s]), 2), round(float(times[i]), 2)))
            s = None
    if s is not None:
        reg.append((round(float(times[s]), 2), round(float(times[-1]), 2)))
    print("quiet <", th, reg)

# audio start / end
nz = np.where(db > -60)[0]
print("first>-60dB", round(float(times[nz[0]]), 2), "last>-60dB", round(float(times[nz[-1]]), 2))
nz = np.where(db > -40)[0]
print("first>-40dB", round(float(times[nz[0]]), 2), "last>-40dB", round(float(times[nz[-1]]), 2))

# --- structure ---
chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=HOP)
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=HOP)
feat = np.vstack([librosa.util.normalize(chroma, axis=1), librosa.util.normalize(mfcc[1:], axis=1)])
for k in (8, 10, 12, 14):
    bd = librosa.segment.agglomerative(feat, k)
    print("segment k=", k, [round(float(x), 2) for x in librosa.frames_to_time(bd, sr=sr, hop_length=HOP)])

# novelty peaks from recurrence
fs = librosa.util.sync(feat, np.arange(0, feat.shape[1], 43), aggregate=np.mean)
R = librosa.segment.recurrence_matrix(fs, width=4, mode="affinity", sym=True)
kernel = np.kron(np.array([[1, -1], [-1, 1]]), np.ones((8, 8)))
nov = np.zeros(R.shape[0])
for i in range(8, R.shape[0] - 8):
    nov[i] = (R[i - 8:i + 8, i - 8:i + 8] * kernel).sum()
pk, _ = ss.find_peaks(nov, prominence=np.percentile(nov, 90) * 0.4, distance=4)
print("novelty s", [int(p * 43 * HOP / sr) for p in pk])

np.savez(out, y=y, env=env, env_p=env_p, db=db, times=times, centre=centre, flat=flat,
         lrc_t=np.array([l[0] for l in lrc]))
json.dump(lrc, open(out + ".lrc.json", "w"), ensure_ascii=False)
