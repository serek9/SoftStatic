import numpy as np, json, sys
from PIL import Image
src=np.array(Image.open('ref/people_sheet.webp').convert('RGBA')).astype(float)
rows=[(45,335),(432,640),(745,1044)]
cols=[[(124,286),(461,631),(823,983),(1175,1347)],[(109,279),(435,654),(820,986),(1154,1370)],[(93,297),(461,642),(805,1000),(1164,1346)]]
SC=float(sys.argv[1]) if len(sys.argv)>1 else 52/290
names=['fisher','dog','rusty']; views=['down','right','up','left']
out={}
for ci,nm in enumerate(names):
  r0,r1=rows[ci]
  sprites=[]
  for vi,(c0,c1) in enumerate(cols[ci]):
    crop=src[r0-2:r1+3,c0-2:c1+3]
    H,W=crop.shape[:2]; th=int(round(H*SC)); tw=int(round(W*SC))
    img=np.zeros((th,tw,4))
    for y in range(th):
      for x in range(tw):
        ys=int(y/SC); ye=max(ys+1,int((y+1)/SC)); xs=int(x/SC); xe=max(xs+1,int((x+1)/SC))
        # sample the central part of the cell to avoid edge blending
        my=(ye-ys)//4; mx=(xe-xs)//4
        cell=crop[ys+my:ye-my or None, xs+mx:xe-mx or None].reshape(-1,4)
        if cell.size==0: cell=crop[ys:ye,xs:xe].reshape(-1,4)
        op=cell[cell[:,3]>128]
        if len(op) < len(cell)*0.5: continue
        img[y,x,:3]=np.median(op[:,:3],axis=0); img[y,x,3]=255
    sprites.append(img)
  out[nm]=sprites
np.save('sprites.npy', np.array([s for nm in names for s in out[nm]], dtype=object), allow_pickle=True)
# preview
pad=4
for nm in names:
  sp=out[nm]; W=sum(s.shape[1] for s in sp)+pad*5; H=max(s.shape[0] for s in sp)+pad*2
  can=np.zeros((H,W,4)); can[:,:,:3]=(200,200,200); can[:,:,3]=255; x=pad
  for s in sp:
    h,w=s.shape[:2]; m=s[:,:,3]>0; reg=can[pad:pad+h,x:x+w]; reg[m]=s[m]; x+=w+pad
  Image.fromarray(can.astype(np.uint8)).resize((W*6,H*6),Image.NEAREST).save(nm+'_raw.png')
  print(nm,[s.shape[:2] for s in sp])
