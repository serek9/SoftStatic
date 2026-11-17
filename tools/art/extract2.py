# Phase 127: the user's second sheet (ref/people_sheet2.webp, 2026-11-17): the knit-hat, rain-hat
# and headlamp fishers and the husky, the St. Bernard and the curly dog, four sides each, sampled
# cell by cell as extract.py does the first. Cells are found from the sheet's alpha.
import numpy as np, pickle
from PIL import Image
src=np.array(Image.open('ref/people_sheet2.webp').convert('RGBA')).astype(float)
fg=src[:,:,3]>128
def runs(v):
  out=[];s=None
  for i,x in enumerate(v):
    if x>0 and s is None:s=i
    if x<=0 and s is not None: out.append((s,i));s=None
  if s is not None: out.append((s,len(v)))
  return out
NAMES=['knit_hat','rain_hat','headlamp','husky','saint','poodle']
SC={'fisher':52/266.0,'dog':38/206.0}
out={}
for ri,(r0,r1) in enumerate(runs(fg.sum(1))):
  nm=NAMES[ri]; sc=SC['fisher' if ri<3 else 'dog']; sp=[]
  for (c0,c1) in runs(fg[r0:r1].sum(0)):
    ys=[y for y in range(r0,r1) if fg[y,c0:c1].any()]; y0,y1=ys[0],ys[-1]+1
    crop=src[y0:y1,c0:c1]; H,W=crop.shape[:2]; th=int(round(H*sc)); tw=int(round(W*sc))
    img=np.zeros((th,tw,4))
    for y in range(th):
      for x in range(tw):
        a=int(y/sc); b=max(a+1,int((y+1)/sc)); c=int(x/sc); d=max(c+1,int((x+1)/sc))
        my=(b-a)//4; mx=(d-c)//4
        cell=crop[a+my:b-my or None, c+mx:d-mx or None].reshape(-1,4)
        if cell.size==0: cell=crop[a:b,c:d].reshape(-1,4)
        op=cell[cell[:,3]>128]
        if len(op)<len(cell)*0.5: continue
        img[y,x,:3]=np.median(op[:,:3],axis=0); img[y,x,3]=255
    sp.append(img)
  out[nm]=sp; print(nm,[s.shape[:2] for s in sp])
pickle.dump(out,open('out2/raw.pkl','wb'))
