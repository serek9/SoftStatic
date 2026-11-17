import numpy as np
from PIL import Image
ref=np.array(Image.open('ref/shop.png').convert('RGB')).astype(int)
R=ref.copy()
def best_dx(x0,x1,y0,y1,cands):
  # the source that matches the hole's border best (left/right columns and the row above/below)
  best=None
  for dx in cands:
    s=ref[y0-1:y1+1,x0-1+dx:x1+1+dx]; d=ref[y0-1:y1+1,x0-1:x1+1]
    e=np.abs(s[:,0]-d[:,0]).sum()+np.abs(s[:,-1]-d[:,-1]).sum()+np.abs(s[0]-d[0]).sum()+np.abs(s[-1]-d[-1]).sum()
    if best is None or e<best[0]: best=(e,dx)
  return best[1]
x0,x1,y0,y1=568,716,512,634
dx=best_dx(x0,x1,y0,y1,list(range(-260,-120))+list(range(150,200)))
R[y0:y1,x0:x1]=ref[y0:y1,x0+dx:x1+dx]; print('floor dx',dx)
rx0,rx1,ry0,ry1=818,912,250,334
# behind Rusty: vertical boards, so take the same rows from a stretch of wall that matches, else the rows above
dx2=best_dx(rx0,rx1,ry0,300,list(range(80,100)))
R[ry0:300,rx0:rx1]=ref[ry0:300,rx0+dx2:rx1+dx2]; print('wall dx',dx2)
best=None
for dy in range(30,60):
  s=R[300-dy:ry1-dy,rx0:rx1]; e=np.abs(s[-1]-ref[ry1,rx0:rx1]).sum()+np.abs(s[:,0]-ref[300:ry1,rx0-1]).sum()+np.abs(s[:,-1]-ref[300:ry1,rx1]).sum()
  if best is None or e<best[0]: best=(e,dy)
R[300:ry1,rx0:rx1]=R[300-best[1]:ry1-best[1],rx0:rx1]; print('dy',best[1])
Image.fromarray(R.astype(np.uint8)).save('ref_clean.png')
