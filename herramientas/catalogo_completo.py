import json, sys, time, urllib.request, urllib.error, urllib.parse, pathlib, re
P=pathlib.Path(sys.argv[1]); OUT=P/"dataset"/"catalogo_completo"; UA={"User-Agent":"Mozilla/5.0"}
def get(u, binary=False):
    for intento in range(8):
        try:
            r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30).read()
            return r if binary else json.loads(r)
        except urllib.error.HTTPError as e:
            if e.code in (429,503): time.sleep(5*(intento+1)); continue
            raise
        except Exception: time.sleep(3)
    raise RuntimeError("fallo "+u)
prods={}
f=OUT/"productos.json"
if f.exists(): prods=json.load(open(f))
else:
    i=0
    while i<2500:
        L=get(f"https://www.bata.com.bo/api/catalog_system/pub/products/search?_from={i}&_to={i+49}")
        if not L: break
        for p in L: prods[p["productId"]]=p
        print("pagina",i,len(prods),flush=True); i+=50; time.sleep(2)
    json.dump(prods,open(f,"w"))
NO=re.compile(r"MEDIA|CARTERA|MOCHILA|BILLETERA|CORDON|PLANTILLA|BETUN|CREMA|LIMPIA|BOLSO|GORRA|CINTURON|SPRAY|ESPONJA|KIT",re.I)
sel=[]
for pid,p in prods.items():
    cat=(p.get("categories") or [""])[0]
    if NO.search(p["productName"]) or not re.search(r"Hombre|Dama|Infantil|Niñ|Mujer",cat+p["productName"],re.I): continue
    urls=[]
    for it in p["items"]:
        for im in it["images"]:
            if im["imageUrl"] not in urls: urls.append(im["imageUrl"])
    if len(urls)<2: continue
    sel.append((pid,p,urls))
print("calzado con >=2 fotos:",len(sel),flush=True)
from concurrent.futures import ThreadPoolExecutor
tareas=[]
cat=[]
for k,(pid,p,urls) in enumerate(sel):
    slug=(re.sub(r'[^a-z0-9]+','_',p['productName'].lower()).strip('_')[:40]+"_"+pid[-4:])
    d=P/"dataset"/"originales"/slug; d.mkdir(parents=True,exist_ok=True)
    have=len(list(d.glob("*.jpg")))
    for j,u in enumerate(urls[:5]):
        if j<have: continue
        u=re.sub(r"(/ids/\d+)(-\d+-\d+)?/",r"\1-500-500/",u)
        tareas.append((urllib.parse.quote(u,safe=":/?=&%"),d/f"{j}.jpg"))
    try: price=p['items'][0]['sellers'][0]['commertialOffer'].get('Price') or 0
    except Exception: price=0
    c=(p.get("categories") or [""])[0]
    tipo="Deportivo" if re.search(r"DEPORT|TENIS|ZAPATILLA|RUNNING|FUTBOL",p["productName"],re.I) else ("Formal cuero/cuero" if re.search(r"VESTIR|FORMAL|LOAFER|MOCAS",p["productName"],re.I) else "Casual cuero (suela caucho)")
    cat.append(dict(id=slug,productId=pid,nombre=p['productName'].strip(),marca=p.get('brand'),categoria=tipo,seccion=c.strip("/").split("/")[0],precio_bs=price,imagen=f"img/{slug}.jpg",n_fotos=min(len(urls),5)))

print("imagenes a bajar:",len(tareas),flush=True)
hechas=[0]
def baja(t):
    u,f=t
    try: f.write_bytes(get(u,True))
    except Exception as e: print("ERR",u,e,flush=True)
    hechas[0]+=1
    if hechas[0]%200==0: print("imgs",hechas[0],flush=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(baja,tareas))
json.dump(cat,open(OUT/"catalogo.json","w"),ensure_ascii=False,indent=1)
print("FIN",len(cat),flush=True)
