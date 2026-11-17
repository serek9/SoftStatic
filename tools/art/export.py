import pickle, colorsys, numpy as np
CH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
VIEWS=['down','right','up','left']
def lum(c): return 0.3*c[0]+0.59*c[1]+0.11*c[2]
def role_fisher(c):
  r,g,b=[v/255 for v in c]; h,l,s=colorsys.rgb_to_hls(r,g,b); L=lum(c)
  if L<38: return 'ink'
  if b>r and b>g*0.95: return 'trousers'
  if 0.12<h<0.25 and s>0.25: return 'coat'
  if L>150: return 'skin'
  if c==(199,138,96) or (c[0]>190 and c[1]>110): return 'skin'
  return 'brown'
out=[]
def emit(nm, keys, maps, roles=None, lvls=None):
  out.append('    %s: {' % nm)
  out.append('      keys: [%s],' % ', '.join("'%s'" % k for k in keys))
  if roles: out.append('      roles: [%s],' % ', '.join("'%s'" % r for r in roles)); out.append('      levels: [%s],' % ', '.join('%.2f' % v for v in lvls))
  for vi,mp in enumerate(maps):
    out.append("      %s: [" % VIEWS[vi])
    for row in mp: out.append("        '%s'," % ''.join('.' if v < 0 else CH[v] for v in row))
    out.append('      ],')
  out.append('    },')
pal_lines=[]
for nm,prefix in (('fisher','pf'),('dog','pd'),('rusty','pr')):
  maps,C=pickle.load(open(nm+'.pkl','rb'))
  C=[tuple(int(v) for v in c) for c in C]
  keys=['%s%d' % (prefix,i) for i in range(len(C))]
  for k,c in zip(keys,C): pal_lines.append("%s: '#%02x%02x%02x'" % (k,*c))
  roles=lvls=None
  if nm=='fisher':
    base=[role_fisher(c) for c in C]
    # per-pixel roles for the browns: hat above the face, boots at the feet, hair between
    maps=[np.array(m) for m in maps]
    ext={}; newmaps=[]
    for vi,mp in enumerate(maps):
      h,w=mp.shape; skinrows=[y for y in range(h) if any(mp[y,x]>=0 and base[mp[y,x]]=='skin' for x in range(w))]; ft=skinrows[0]
      m2=mp.copy()
      for y in range(h):
        for x in range(w):
          v=mp[y,x]
          if v<0: continue
          r=base[v]
          if r=='coat' and ft<=y<ft+11 and 0.25*w<x<0.75*w: m2[y,x]=min(range(len(C)),key=lambda j: lum(C[j]))   # a stray green in the face: an eye
          if r=='brown':
            rr='hat' if (y<=ft-3 or (y<=ft+2 and lum(C[v])>62)) else ('boots' if y>0.85*h else 'hair')
            if rr!='hat':
              key=(v,rr)
              if key not in ext: ext[key]=len(C)+len(ext)
              m2[y,x]=ext[key]
      newmaps.append(m2)
    # extra indices: copies of brown colours in the hair or boots role
    for (v,rr),ix in sorted(ext.items(),key=lambda e:e[1]):
      C.append(C[v]); keys.append(keys[v]); base.append(rr)
    roles=['hat' if r=='brown' else r for r in base]
    maps=newmaps
    lvls=[]
    for i,c in enumerate(C):
      same=[lum(C[j]) for j in range(len(C)) if roles[j]==roles[i]]
      lo,hi=min(same),max(same); lvls.append(0.5 if hi==lo else (lum(c)-lo)/(hi-lo))
  if nm=='dog':
    roles=['ink' if lum(c)<45 else 'coat' for c in C]
    same=[lum(c) for c,r in zip(C,roles) if r=='coat']; lo,hi=min(same),max(same)
    lvls=[(lum(c)-lo)/(hi-lo) for c in C]
  emit(nm, keys, [np.array(m) for m in maps], roles, lvls)
js=["var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});","",
"// The people of the walk-in rooms as the user drew them (Phase 124: the user's character sheet,",
"// 2026-11-17): the fisher, the dog and Rusty from the front, the right, behind and the left,",
"// sampled cell by cell to their size in the rooms and held to a short palette of their own",
"// (js/gfx/sprites.js pf*, pd*, pr*). Each row is a string: '.' is clear, any other character the",
"// index of a key. roles and levels let a look recolour the fisher (coat, hat, hair, skin,",
"// trousers; boots and outline keep theirs) and a breed recolour the dog (its coat).",
"G.gfx = G.gfx || {};","G.gfx.peopleArt = {"]
js+=out; js.append('};')
open('people_art.js','w').write('\n'.join(js)+'\n')
open('pal.txt','w').write(',\n'.join(pal_lines))
print(len('\n'.join(js)), 'bytes'); print(len(pal_lines),'keys')
