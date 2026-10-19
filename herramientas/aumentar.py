import sys, random, pathlib, numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
random.seed(7); np.random.seed(7)
P=pathlib.Path(sys.argv[1]); O=P/"dataset"/"originales"; A=P/"dataset"/"aumentado"; S=224
FONDOS=[f for f in pathlib.Path("/System/Library/Desktop Pictures").rglob("*") if f.suffix.lower() in (".jpg",".heic",".png")]
FONDOS=[f for f in FONDOS if f.suffix.lower()!=".heic" and min(Image.open(f).size)>=600][:40]
def fondo():
  r=random.random()
  if r<0.35 and FONDOS:
    im=Image.open(random.choice(FONDOS)).convert("RGB"); w,h=im.size; s=random.randint(300,min(w,h))
    x,y=random.randint(0,w-s),random.randint(0,h-s); return im.crop((x,y,x+s,y+s)).resize((S,S))
  if r<0.7:
    c=np.array([random.randint(40,255) for _ in range(3)]); n=np.random.normal(0,random.uniform(2,18),(S,S,3))
    return Image.fromarray(np.clip(c+n,0,255).astype("uint8"))
  g=np.linspace(random.randint(80,255),random.randint(80,255),S)[:,None,None]*np.ones((S,S,3))
  return Image.fromarray(np.clip(g+np.random.normal(0,6,(S,S,3)),0,255).astype("uint8"))
def recorte(im):
  a=np.asarray(im.convert("RGB")).astype(int); bgc=a[2,2]
  m=(np.abs(a-bgc).sum(2)>30); ys,xs=np.where(m)
  if len(xs)==0: return im, None
  box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
  mask=Image.fromarray((m*255).astype("uint8")).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
  return im.crop(box), mask.crop(box)
def variante(src):
  obj,mask=recorte(src)
  bg=fondo() if random.random()<0.75 else Image.new("RGB",(S,S),tuple(np.asarray(src)[2,2]))
  sc=random.uniform(0.55,1.0); w,h=obj.size; k=sc*S/max(w,h); nw,nh=max(1,int(w*k)),max(1,int(h*k))
  o=obj.resize((nw,nh)); m=mask.resize((nw,nh)) if mask else None
  ang=random.uniform(-25,25); o=o.rotate(ang,expand=True,fillcolor=(0,0,0)); m=(m.rotate(ang,expand=True) if m else None)
  if random.random()<0.5: o=ImageOps.mirror(o); m=ImageOps.mirror(m) if m else None
  x=random.randint(min(0,S-o.size[0]),max(0,S-o.size[0])); y=random.randint(min(0,S-o.size[1]),max(0,S-o.size[1]))
  bg.paste(o,(x,y),m)
  im=ImageEnhance.Brightness(bg).enhance(random.uniform(0.6,1.35))
  im=ImageEnhance.Contrast(im).enhance(random.uniform(0.7,1.3))
  im=ImageEnhance.Color(im).enhance(random.uniform(0.75,1.25))
  if random.random()<0.35: im=im.filter(ImageFilter.GaussianBlur(random.uniform(0.3,1.6)))
  if random.random()<0.3:
    t=Image.new("RGB",(S,S),tuple(random.randint(0,255) for _ in range(3))); im=Image.blend(im,t,random.uniform(0.05,0.18))
  return im
N=int(sys.argv[2]) if len(sys.argv)>2 else 60
for d in sorted(O.iterdir()):
  fs=sorted(d.glob("*.jpg")); out=A/d.name; out.mkdir(parents=True,exist_ok=True)
  for i in range(N):
    f=fs[i%len(fs)]; variante(Image.open(f).convert("RGB")).save(out/f"{f.stem}_{i}.jpg",quality=90)
  print(d.name,len(list(out.glob('*.jpg'))))
# clase "otro": fondos, ruido, y fondos con formas
out=A/"otro"; out.mkdir(parents=True,exist_ok=True)
for i in range(400):
  im=fondo()
  if random.random()<0.5:
    from PIL import ImageDraw
    dr=ImageDraw.Draw(im)
    for _ in range(random.randint(1,6)):
      x,y=random.randint(0,S),random.randint(0,S); r=random.randint(10,90)
      dr.ellipse((x-r,y-r,x+r,y+r) if random.random()<.5 else (x,y,x+r*2,y+r),fill=tuple(random.randint(0,255) for _ in range(3)))
  im.save(out/f"otro_{i}.jpg",quality=90)
print("otro",400)
