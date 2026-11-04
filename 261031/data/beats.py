import json, sys
import numpy as np, librosa, scipy.signal as ss
path, feat, out = sys.argv[1:4]
SR, HOP = 22050, 512
d = np.load(feat)
y, env, db, times, centre = d["y"], d["env"], d["db"], d["times"], d["centre"]
lrc = json.load(open(feat + ".lrc.json"))
_, b = librosa.beat.beat_track(onset_envelope=env, sr=SR, hop_length=HOP, start_bpm=120, units="time")
n = np.arange(len(b))
sl, ic = np.polyfit(n, b, 1)
res = b - (ic + sl * n)
print("pulse fit bpm", 60 / sl, "period", sl, "resid rms", res.std(), "max", abs(res).max())
for a, c in [(0, 40), (40, 100), (100, 160), (160, 210), (210, 253)]:
    m = (b >= a) & (b < c)
    p = np.polyfit(n[m], b[m], 1)
    print("  seg", a, c, "bpm", round(60 / p[0], 2), "offset@grid", round(float(np.mean(b[m] - (ic + sl * n[m]))), 3))
# bar phase: 16-pulse phase scored by low-band onset + lrc phrase starts
S = np.abs(librosa.stft(y, hop_length=HOP))
fr = librosa.fft_frequencies(sr=SR)
low = np.diff(S[fr < 150].sum(axis=0), prepend=0).clip(0)
def at(arr, t):
    i = int(t * SR / HOP)
    return arr[max(i - 2, 0):i + 3].max()
for per in (2, 4, 8, 16):
    sc = [np.mean([at(low, x) for x in b[(n % per) == k] if x > 20]) for k in range(per)]
    print("low-onset phase per", per, np.round(np.array(sc) / max(sc), 2), "best", int(np.argmax(sc)))
lt = np.array([l[0] for l in lrc])
ph = ((lt - ic) / sl)
print("lrc pulse phase mod 8", np.round(ph % 8, 1))
# vocal onset near LRC stamps
smooth = np.convolve(centre, np.ones(5) / 5, mode="same")
c_env = np.diff(np.log1p(smooth), prepend=0).clip(0)
rows = []
for i, (t, _) in enumerate(lrc):
    w = (times > t - 0.7) & (times < t + 0.7)
    ix = np.where(w)[0]
    v = ix[np.argmax(c_env[ix])]
    near = b[np.argmin(abs(b - t))]
    pre = smooth[(times > t - 0.5) & (times < t - 0.1)].mean()
    post = smooth[(times > t) & (times < t + 0.6)].mean()
    rows.append(dict(line=i + 1, lrc=t, vocal_onset=round(float(times[v]), 2), delta=round(float(times[v] - t), 2),
                     beat=round(float(near), 3), beat_delta=round(float(near - t), 3), rise=round(float(post / (pre + 1e-6)), 2)))
    print(rows[-1])
# accents at end
pk = librosa.util.peak_pick(env, pre_max=8, post_max=8, pre_avg=20, post_avg=20, delta=np.percentile(env, 70), wait=6)
pt = times[pk]
print("env p95 p99 max", np.percentile(env, 95), np.percentile(env, 99), env.max())
for i in pk:
    if times[i] > 236:
        print("onset", round(float(times[i]), 2), "str", round(float(env[i]), 2), "db", round(float(db[i]), 1),
              "db+0.2s", round(float(db[min(i + 9, len(db) - 1)]), 1))
th = np.percentile(env, 95)
print("strong after 240", [(round(float(times[i]), 2), round(float(env[i]), 1)) for i in pk if times[i] > 240 and env[i] > th])
th2 = np.percentile(env, 80)
print("moderate after 250", [(round(float(times[i]), 2), round(float(env[i]), 1)) for i in pk if times[i] > 250 and env[i] > th2])
json.dump(dict(pulse=sl, offset=ic, beats=[round(float(x), 3) for x in b], lines=rows), open(out, "w"))
