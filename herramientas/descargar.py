import json, sys, urllib.request, pathlib, re
P=pathlib.Path(sys.argv[1])
SEL=[("10017718","Deportivo"),("10017984","Deportivo"),("10017722","Deportivo"),("10017818","Deportivo"),
     ("10017597","Casual cuero (suela caucho)"),("10017617","Casual cuero (suela caucho)"),("10017783","Casual cuero (suela caucho)"),
     ("10017469","Formal cuero/cuero"),("10016271","Formal cuero/cuero"),("10017764","Formal cuero/cuero")]
UA={"User-Agent":"Mozilla/5.0"}
import glob, time
ALL={q['productId']:q for f in glob.glob(str(P/"datos"/"vtex_*.json")) for q in (json.load(open(f)) if open(f).read(1)=='[' else [])}
cat=[]
for pid,c in SEL:
  p=ALL[pid]
  slug=re.sub(r'[^a-z0-9]+','_',p['productName'].lower()).strip('_')[:40]
  d=P/"dataset"/"originales"/slug; d.mkdir(parents=True,exist_ok=True)
  urls=[]
  for it in p['items']:
    for im in it['images']:
      if im['imageUrl'] not in urls: urls.append(im['imageUrl'])
  for i,iu in enumerate(urls):
    (d/f"{i}.jpg").write_bytes(urllib.request.urlopen(urllib.request.Request(iu,headers=UA)).read()); time.sleep(0.7)
  price=p['items'][0]['sellers'][0]['commertialOffer'].get('Price')
  cat.append(dict(id=slug,productId=pid,nombre=p['productName'],marca=p.get('brand'),categoria=c,precio_bs=price,
                  url=p.get('link'),imagen=f"img/{slug}.jpg",n_fotos=len(urls)))
  print(slug,len(urls),price)
json.dump(cat,open(P/"dataset"/"catalogo.json","w"),ensure_ascii=False,indent=1)
