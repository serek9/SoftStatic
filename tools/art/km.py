import numpy as np
from PIL import Image
sp=np.load('sprites.npy',allow_pickle=True)
groups={'fisher':sp[0:4],'dog':sp[4:8],'rusty':sp[8:12]}
K={'fisher':26,'dog':14,'rusty':28}
rng=np.random.default_rng(1)
def kmeans(X,k,it=40):
  # kmeans++ init
  C=[X[rng.integers(len(X))]]
  for _ in range(k-1):
    d=np.min(((X[:,None,:]-np.array(C)[None])**2).sum(2),1); C.append(X[rng.choice(len(X),p=d/d.sum())])
  C=np.array(C,float)
  for _ in range(it):
    lab=((X[:,None,:]-C[None])**2).sum(2).argmin(1)
    for j in range(k):
      m=X[lab==j]
      if len(m): C[j]=m.mean(0)
  return C,lab
out={}
for nm,ss in groups.items():
  X=np.concatenate([s[s[:,:,3]>0][:,:3] for s in ss]).astype(float)
  C,lab=kmeans(X,K[nm]); C=np.round(C).astype(int)
  out[nm]=C
  # rebuild sprites with snapped colours
  maps=[]
  for s in ss:
    h,w=s.shape[:2]; m=s[:,:,3]>0; idx=-np.ones((h,w),int)
    P=s[m][:,:3]; idx[m]=((P[:,None,:]-C[None])**2).sum(2).argmin(1); maps.append(idx)
  order=np.argsort(C.sum(1))
  print(nm,' '.join('#%02x%02x%02x'%tuple(C[o]) for o in order))
  import pickle; pickle.dump((maps,C),open(nm+'.pkl','wb'))
  pad=4; W=sum(mp.shape[1] for mp in maps)+pad*5; H=max(mp.shape[0] for mp in maps)+pad*2
  can=np.full((H,W,3),200,np.uint8); x=pad
  for mp in maps:
    h,w=mp.shape; reg=can[pad:pad+h,x:x+w]; reg[mp>=0]=C[mp[mp>=0]]; x+=w+pad
  Image.fromarray(can).resize((W*6,H*6),Image.NEAREST).save(nm+'_q.png')
