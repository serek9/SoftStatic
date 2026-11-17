import numpy as np, pickle
from PIL import Image
R=np.array(Image.open('ref_clean.png').convert('RGB')).astype(float)
X0,X1,Y0,Y1=264,1014,14,696
W,H=384,340
sx=(X1-X0)/W; sy=(Y1-Y0)/H
img=np.zeros((H,W,3))
for y in range(H):
  ys=Y0+y*sy; ye=Y0+(y+1)*sy
  for x in range(W):
    xs=X0+x*sx; xe=X0+(x+1)*sx
    cell=R[int(ys):max(int(ys)+1,int(ye)), int(xs):max(int(xs)+1,int(xe))].reshape(-1,3)
    img[y,x]=np.median(cell,axis=0)
# k-means 64
rng=np.random.default_rng(3)
Xp=img.reshape(-1,3); k=64
C=[Xp[rng.integers(len(Xp))]]
for _ in range(k-1):
  d=np.min(((Xp[:,None,:]-np.array(C)[None])**2).sum(2),1); C.append(Xp[rng.choice(len(Xp),p=d/d.sum())])
C=np.array(C)
for it in range(25):
  lab=np.concatenate([((Xp[i:i+20000,None,:]-C[None])**2).sum(2).argmin(1) for i in range(0,len(Xp),20000)])
  for j in range(k):
    m=Xp[lab==j]
    if len(m): C[j]=m.mean(0)
C=np.round(C).astype(int)
lab=lab.reshape(H,W)
pickle.dump((lab,C),open('room.pkl','wb'))
q=C[lab].astype(np.uint8); Image.fromarray(q).save('room_q.png')
Image.fromarray(q).resize((W*2,H*2),Image.NEAREST).save('room_q2.png')
print('ok')
