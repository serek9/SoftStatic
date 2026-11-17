import numpy as np, pickle
lab,C=pickle.load(open('room.pkl','rb'))
H,W=lab.shape
CH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'
assert len(CH)>=len(C)
rows=[''.join(CH[v] for v in lab[y]) for y in range(H)]
# bulbs: bright warm pixels in the top band
L=(0.3*C[lab][:,:,0]+0.59*C[lab][:,:,1]+0.11*C[lab][:,:,2])
pts=[]
band=L[14:34,30:360]>205
ys,xs=np.where(band)
used=np.zeros(len(xs),bool)
for i in range(len(xs)):
  if used[i]: continue
  m=(abs(xs-xs[i])<=3)&(abs(ys-ys[i])<=3); used|=m
  pts.append((int(round(xs[m].mean()))+30,int(round(ys[m].mean()))+14))
pts=[p for p in pts if not (212<=p[0]<=246 and p[1]>=22)]   # not the clock's face
print(len(pts),pts)
pal=["ps%d: '#%02x%02x%02x'" % (i,*C[i]) for i in range(len(C))]
js=["var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});","",
"// The bait shop as the user's reference shows it (Phase 124, 2026-11-17: \"practically the same\"):",
"// the picture sampled cell by cell to the room's 384×340 and held to 64 keys of its own",
"// (js/gfx/sprites.js ps0-ps63), with the boy, the dog and Rusty painted out (the walk draws",
"// them). Each row a string, a character per pixel: the index of its key. bulbs: the string",
"// lights' globes (room px), for their glow at night.",
"G.gfx = G.gfx || {};","G.gfx.shopArt = {",
"  keys: [%s]," % ', '.join("'ps%d'" % i for i in range(len(C))),
"  bulbs: [%s]," % ', '.join('[%d, %d]' % p for p in pts),
"  rows: ["]
js+=["    '%s'," % r for r in rows]
js+=["  ]","};"]
open('shop_art.js','w').write('\n'.join(js)+'\n'); open('room_pal.txt','w').write(',\n'.join(pal))
print(sum(len(x) for x in js))
