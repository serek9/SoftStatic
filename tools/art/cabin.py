# The cabin (Phase 128): the user's picture (ref/cabin.webp, 1536x1024) sampled cell by cell to the
# room's 528x352 and held to 64 keys of its own (pv0-pv63). Writes out3/cabin.pkl and a preview.
import numpy as np, pickle, os
from PIL import Image
os.makedirs('out3', exist_ok=True)
R = np.array(Image.open('ref/cabin.webp').convert('RGB')).astype(float)
W, H = 528, 352
sx = R.shape[1] / W; sy = R.shape[0] / H
img = np.zeros((H, W, 3))
for y in range(H):
    ys = y * sy; ye = (y + 1) * sy
    for x in range(W):
        xs = x * sx; xe = (x + 1) * sx
        cell = R[int(ys):max(int(ys) + 1, int(ye)), int(xs):max(int(xs) + 1, int(xe))].reshape(-1, 3)
        img[y, x] = np.median(cell, axis=0)
rng = np.random.default_rng(3)
Xp = img.reshape(-1, 3); k = 64
C = [Xp[rng.integers(len(Xp))]]
for _ in range(k - 1):
    d = np.min(((Xp[:, None, :] - np.array(C)[None]) ** 2).sum(2), 1); C.append(Xp[rng.choice(len(Xp), p=d / d.sum())])
C = np.array(C)
for it in range(30):
    lab = np.concatenate([((Xp[i:i + 20000, None, :] - C[None]) ** 2).sum(2).argmin(1) for i in range(0, len(Xp), 20000)])
    for j in range(k):
        m = Xp[lab == j]
        if len(m): C[j] = m.mean(0)
C = np.round(C).astype(int)
lab = lab.reshape(H, W)
pickle.dump((lab, C, img), open('out3/cabin.pkl', 'wb'))
q = C[lab].astype(np.uint8)
Image.fromarray(q).save('out3/cabin_q.png')
Image.fromarray(q).resize((W * 2, H * 2), Image.NEAREST).save('out3/cabin_q2.png')
Image.fromarray(img.astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST).save('out3/cabin_s2.png')
print('ok')
