import sys, pandas as pd, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
P=sys.argv[1]; d=pd.read_excel(f"{P}/datos/base_manaco.xlsx")
corto={"Calzado deportivo con suela de caucho/plástico":"Deportivo",
 "Calzado con suela de caucho/plástico y parte superior de cuero":"Casual cuero (suela caucho)",
 "Calzado con suela de cuero y parte superior de cuero/material similar":"Formal cuero/cuero"}
d["Cat"]=d["Categoría_calzado"].map(corto)
k=["País_reportante","Flujo_comercial","Año","Código_SA6","Categoría_calzado","Cat","Socio_comercial"]
dep=d.groupby(k,as_index=False)[["Valor_USD","Cantidad_pares"]].sum()
dep["Valor_USD_por_par"]=dep.Valor_USD/dep.Cantidad_pares
dep=dep[dep.Socio_comercial!="Mundo"]
dep.to_excel(f"{P}/entregables/tabla_depurada.xlsx",index=False)
g=dep.groupby(["Cat","Flujo_comercial"]).agg(V=("Valor_USD","sum"),Q=("Cantidad_pares","sum")); g["ppp"]=g.V/g.Q
ind=g.reset_index(); ind.to_csv(f"{P}/entregables/indicadores.csv",index=False)
import glob, os
from matplotlib import font_manager
for f in glob.glob(os.path.expanduser("~/Library/Fonts/Poppins-*.ttf")): font_manager.fontManager.addfont(f)
plt.rcParams.update({"font.family":"Poppins","font.size":11,"axes.spines.top":False,"axes.spines.right":False,"axes.spines.left":False,
  "axes.edgecolor":"#CACACB","axes.labelcolor":"#575756","xtick.color":"#575756","ytick.color":"#575756","axes.titleweight":"bold","axes.titlesize":13,
  "axes.grid":True,"axes.grid.axis":"x" if False else "y","grid.color":"#EEEEEE","axes.axisbelow":True,"legend.frameon":False})
C={"Importación":"#E40140","Exportación":"#111111"}
# 1 Import vs Export por categoría
v=g.V.unstack()/1e9; ax=v[["Importación","Exportación"]].plot.barh(color=[C["Importación"],C["Exportación"]],figsize=(9,4.5))
ax.set_xlabel("Miles de millones USD (2020-2024)"); ax.set_ylabel(""); ax.set_title("Importaciones vs exportaciones por categoría")
for c in ax.containers: ax.bar_label(c,fmt="%.1f",padding=3)
ax.legend(title=None); ax.grid(axis="y",visible=False); ax.grid(axis="x",color="#EEEEEE")
plt.tight_layout(); plt.savefig(f"{P}/graficos/1_import_vs_export.png",dpi=180); plt.close()
# 2 Socios
fig,axs=plt.subplots(1,2,figsize=(11,4.5))
for a,f in zip(axs,["Importación","Exportación"]):
  s=(dep[dep.Flujo_comercial==f].groupby("Socio_comercial").Valor_USD.sum().nlargest(8)/1e9).sort_values()
  s.plot.barh(ax=a,color=C[f]); a.set_title(f"Top 8 {'proveedores' if f=='Importación' else 'destinos'}"); a.set_ylabel(""); a.set_xlabel("Miles de millones USD")
[a.grid(axis="y",visible=False) or a.grid(axis="x",color="#EEEEEE") for a in axs]
plt.tight_layout(); plt.savefig(f"{P}/graficos/2_socios.png",dpi=180); plt.close()
# 3 Valor por par
p=g.ppp.unstack()[["Importación","Exportación"]]; ax=p.plot.bar(color=[C["Importación"],C["Exportación"]],figsize=(9,4.5),rot=0)
ax.set_ylabel("USD por par"); ax.set_xlabel(""); ax.set_title("Valor comercial aproximado por par")
for c in ax.containers: ax.bar_label(c,fmt="$%.1f",padding=3)
ax.legend(title=None); ax.grid(axis="x",visible=False)
plt.tight_layout(); plt.savefig(f"{P}/graficos/3_valor_por_par.png",dpi=180); plt.close()
print(ind.round(2).to_string()); print("filas depuradas:",len(dep))
