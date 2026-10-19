// Falla si cambió algún archivo que el service worker guarda en caché y NO se subió VERSION en sw.js.
// Evita el error B4: celulares con la versión vieja en caché. Uso: node herramientas/verificar_version.js [refBase=HEAD~1]
"use strict";
const { execSync } = require("node:child_process");
const base = process.argv[2] || "HEAD~1";
const sh = c => execSync(c, { encoding: "utf8" }).trim();
let cambiados;
try { cambiados = sh(`git diff --name-only ${base} -- .`).split("\n").filter(Boolean); }
catch { console.log("Sin referencia base (primer commit): se omite."); process.exit(0); }
const enCache = f => /^(index\.html|manifest\.json|catalogo\.json|mercado\.json|js\/|vendor\/|icons\/|img\/|modelo\/|mobilenet\/)/.test(f);
const relevantes = cambiados.filter(enCache);
const versionCambio = sh(`git diff ${base} -- sw.js`).split("\n").some(l => /^\+const VERSION/.test(l));
if (relevantes.length && !versionCambio) {
  console.error(`✗ Cambiaron ${relevantes.length} archivo(s) en caché (${relevantes.slice(0, 5).join(", ")}…) pero VERSION de sw.js sigue igual.`);
  process.exit(1);
}
console.log(relevantes.length ? "✓ VERSION actualizada." : "✓ Sin cambios en archivos en caché.");
