# The cabin (Phase 128), step 2: the furniture the fisher can pass behind, cut from the picture.
# Each cut: a rectangle (room px), the y its feet stand on, and per row the span that is the thing
# itself (from the first to the last pixel that is neither floor nor rug). Writes out3/cabin_art.js
# (keys, rows, cuts) and out3/cabin_pal.txt (the pv* keys), and out3/cuts.png (a preview).
import numpy as np, pickle
from PIL import Image
lab, C, img = pickle.load(open('out3/cabin.pkl', 'rb'))
H, W = lab.shape
CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'
def keys_in(x0, y0, x1, y1, share=0.01):
    v, n = np.unique(lab[y0:y1, x0:x1], return_counts=True)
    return set(int(a) for a, b in zip(v, n) if b / n.sum() > share)
floor = keys_in(140, 100, 360, 130) | keys_in(290, 285, 470, 320) | keys_in(20, 100, 60, 170) | keys_in(380, 220, 400, 250)
rug = keys_in(180, 180, 210, 220) | keys_in(285, 185, 300, 270) | keys_in(215, 280, 280, 284)
skip = floor | rug
print('floor', sorted(floor), 'rug', sorted(rug - floor))
CUTS = [  # id, x, y, w, h, foot
    ('shelf', 61, 131, 38, 72, 200), ('monstera', 93, 150, 34, 55, 203), ('desk', 27, 176, 57, 59, 233),
    ('chair', 50, 214, 30, 40, 250), ('plant', 25, 245, 23, 30, 273), ('tv', 207, 131, 76, 49, 178),
    ('table', 213, 198, 60, 32, 228), ('sofa', 204, 238, 82, 42, 277), ('sidelamp', 180, 231, 22, 46, 275),
    ('post', 372, 132, 13, 87, 216), ('bed', 402, 133, 54, 67, 197), ('night', 458, 120, 42, 54, 171),
    ('music', 400, 226, 63, 55, 278), ('stool', 417, 258, 20, 32, 288), ('guitar', 367, 228, 38, 56, 280),
    ('records', 467, 218, 33, 66, 282)]
cuts = []; prev = C[lab].astype(np.uint8).copy() // 3
for cid, x, y, w, h, foot in CUTS:
    spans = []
    for yy in range(y, y + h):
        xs = [xx for xx in range(x, x + w) if int(lab[yy, xx]) not in skip]
        if xs: spans += [xs[0] - x, xs[-1] - x + 1]; prev[yy, xs[0]:xs[-1] + 1] = C[lab[yy, xs[0]:xs[-1] + 1]]
        else: spans += [0, 0]
    cuts.append((cid, x, y, w, h, foot, spans))
Image.fromarray(prev).resize((W * 2, H * 2), Image.NEAREST).save('out3/cuts.png')
rows = [''.join(CH[v] for v in lab[y]) for y in range(H)]
js = ["var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});", "",
      "// The cabin as the user drew it (Phase 128, 2026-11-17): their picture sampled cell by cell to the",
      "// room's 528x352 and held to 64 keys of its own (js/gfx/sprites.js pv0-pv63), made with",
      "// tools/art/cabin.py and cabin2.py. Each row a string, a character per pixel: the index of its key.",
      "// cuts: the furniture the fisher can pass behind: {id, x, y, w, h (room px), foot (the y it stands",
      "// on), spans (per row of the rectangle, the first and one past the last pixel of the thing itself)}.",
      "G.gfx = G.gfx || {};", "G.gfx.cabinArt = {",
      "  keys: [%s]," % ', '.join("'pv%d'" % i for i in range(len(C))),
      "  cuts: ["]
js += ["    { id: '%s', x: %d, y: %d, w: %d, h: %d, foot: %d, spans: [%s] }," % (c[0], c[1], c[2], c[3], c[4], c[5], ', '.join(map(str, c[6]))) for c in cuts]
js[-1] = js[-1].rstrip(',')
js += ["  ],", "  rows: ["]
js += ["    '%s'," % r for r in rows]
js[-1] = js[-1].rstrip(',')
js += ["  ]", "};"]
open('out3/cabin_art.js', 'w').write('\n'.join(js) + '\n')
pal = ["pv%d: '#%02x%02x%02x'" % (i, *C[i]) for i in range(len(C))]
open('out3/cabin_pal.txt', 'w').write(', '.join(pal))
print(sum(len(x) for x in js))
