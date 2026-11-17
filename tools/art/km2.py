# Phase 127: each of the second sheet's characters held to its own palette (as km.py).
import numpy as np, pickle
from PIL import Image
raw=pickle.load(open('out2/raw.pkl','rb'))
K={'knit_hat':24,'rain_hat':24,'headlamp':24,'husky':14,'saint':16,'poodle':16}
rng=np.random.default_rng(1)
def kmeans(X,k,it=40):
  C=[X[rng.integers(len(X))]]
  for _ in range(k-1):
    d=np.min(((X[:,None,:]-np.array(C)[None])**2).sum(2),1); C.append(X[rng.choice(len(X),p=d/d.sum())])
  C=np.array(C,float)
  for _ in range(it):
    lab=((X[:,None,:]-C[None])**2).sum(2).argmin(1)
    for j in range(k):
      m=X[lab==j]
      if len(m): C[j]=m.mean(0)
  return C
res={}; strips=[]
for nm,ss in raw.items():
  X=np.concatenate([s[s[:,:,3]>0][:,:3] for s in ss]).astype(float)
  C=np.round(kmeans(X,K[nm])).astype(int); maps=[]
  for s in ss:
    h,w=s.shape[:2]; m=s[:,:,3]>0; idx=-np.ones((h,w),int)
    idx[m]=((s[m][:,:3][:,None,:]-C[None])**2).sum(2).argmin(1); maps.append(idx)
  res[nm]=(maps,C)
  pad=4; W=sum(mp.shape[1] for mp in maps)+pad*5; H=max(mp.shape[0] for mp in maps)+pad*2
  can=np.full((H,W,3),200,np.uint8); x=pad
  for mp in maps:
    h,w=mp.shape; reg=can[pad:pad+h,x:x+w]; reg[mp>=0]=C[mp[mp>=0]]; x+=w+pad
  strips.append(can)
pickle.dump(res,open('out2/q.pkl','wb'))
W=max(s.shape[1] for s in strips); H=sum(s.shape[0] for s in strips)
can=np.full((H,W,3),200,np.uint8); y=0
for s in strips: can[y:y+s.shape[0],:s.shape[1]]=s; y+=s.shape[0]
Image.fromarray(can).resize((W*6,H*6),Image.NEAREST).save('out2/q.png')
