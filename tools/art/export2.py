# Phase 127: people_art2.js (the second sheet's looks and breeds: rows, keys, legs, the dogs'
# trot ramps) and pal2.txt (their pk*, py*, ph*, pu*, pb*, pc* keys).
import numpy as np, pickle
res=pickle.load(open('out2/q.pkl','rb'))
CH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
VIEWS=['down','right','up','left']
PRE={'knit_hat':'pk','rain_hat':'py','headlamp':'ph','husky':'pu','saint':'pb','poodle':'pc'}
def lum(c): return 0.3*c[0]+0.59*c[1]+0.11*c[2]
def hexs(c): return '#%02x%02x%02x'%tuple(int(v) for v in c)
js=[]; pal=[]
for nm,(maps,C) in res.items():
  C=[tuple(int(v) for v in c) for c in C]; keys=['%s%d'%(PRE[nm],i) for i in range(len(C))]
  for k,c in zip(keys,C): pal.append("%s: '%s'"%(k,hexs(c)))
  js.append('    %s: {'%nm)
  js.append('      keys: [%s],'%', '.join("'%s'"%k for k in keys))
  if nm in ('knit_hat','rain_hat','headlamp'):
    legs=[]
    for mp in maps:
      h,w=mp.shape; band=mp[int(h*.6):int(h*.7)]; v=band[band>=0]; cnt=np.bincount(v,minlength=len(C))
      coat=[j for j in np.argsort(-cnt)[:5] if lum(C[j])>45]
      y=int(h*.6)
      while y<h and np.isin(mp[y],coat).sum()>1: y+=1
      legs.append(y)
    js.append('      legs: [%s],'%', '.join(str(v) for v in legs))
  else:
    back=maps[2]; v=back[back>=0]; cnt=np.bincount(v,minlength=len(C))
    def near(seed, ok=lambda j: True): return sorted([j for j in range(len(C)) if lum(C[j])>45 and ok(j)], key=lambda j: sum((C[j][i]-C[seed][i])**2 for i in range(3)))[:5]
    mid=near([j for j in np.argsort(-cnt) if 50<lum(C[j])<165][0])
    pale=near([j for j in np.argsort(-cnt) if lum(C[j])>=165][0] if any(lum(C[j])>=165 and cnt[j] for j in range(len(C))) else max(range(len(C)),key=lambda j:lum(C[j])), lambda j: C[j][0]-C[j][1]<90)
    mid=sorted(mid,key=lambda j:lum(C[j])); pale=sorted(pale,key=lambda j:lum(C[j]))
    js.append('      coat: [%s],'%', '.join("'%s'"%keys[j] for j in mid))
    js.append('      pale: [%s],'%', '.join("'%s'"%keys[j] for j in pale))
  for vi,mp in enumerate(maps):
    js.append('      %s: ['%VIEWS[vi])
    for row in mp: js.append("        '%s',"%''.join('.' if v<0 else CH[v] for v in row))
    js.append('      ],')
  js.append('    },')
open('out2/people_art2.js','w').write('\n'.join(js)+'\n')
open('out2/pal2.txt','w').write(',\n'.join(pal))
print(len(pal),'keys'); print(open('out2/people_art2.js').read().count('\n'),'lines')
