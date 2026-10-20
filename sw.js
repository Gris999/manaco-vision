/* Service worker de Manaco Vision
   - Precarga la app, las librerías, los datos y la IA (~20 MB) para usarla sin internet.
   - Las fotos del catálogo se guardan a medida que se ven y luego en segundo plano.
   - Al publicar una versión nueva, sube VERSION: la app mostrará "Hay una nueva versión". */
const VERSION = "v28-2026-10-19";
const NUCLEO = `mv-nucleo-${VERSION}`;
const FOTOS = "mv-fotos-v1"; // las fotos casi no cambian: se conservan entre versiones

const PRECARGA = [
  "./", "index.html", "informe.html", "manifest.json", "js/dominio.js", "js/acciones.js", "js/xlsx.js", "js/ui/estado.js", "js/ui/nucleo.js", "js/ui/ia.js", "js/ui/operaciones.js", "js/ui/conteo.js", "js/ui/dashboard.js", "js/ui/mercado.js", "js/ui/caja.js", "js/ui/movimientos.js", "js/ui/clientes.js", "js/ui/admin.js", "js/ui/pwa.js", "catalogo.json", "mercado.json",
  "vendor/poppins.css", "vendor/tailwind-3.4.16.js", "vendor/tf-4.22.0.min.js",
  "vendor/mobilenet-2.1.1.min.js", "vendor/chart-4.4.1.umd.min.js",
  ...["300-normal", "400-normal", "500-normal", "600-normal", "700-normal", "800-normal", "700-italic", "800-italic"].map(f => `vendor/fonts/poppins-${f}.woff2`),
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-64.png",
  "mobilenet/model.json", "mobilenet/weights.bin",
  "modelo/model.json", "modelo/weights.bin", "modelo/clases.json",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(NUCLEO).then(c => c.addAll(PRECARGA.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k.startsWith("mv-nucleo-") && k !== NUCLEO).map(k => caches.delete(k)));
    await self.clients.claim();
    precargarFotos(); // en segundo plano, sin bloquear
  })());
});

self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

async function precargarFotos() {
  try {
    const nucleo = await caches.open(NUCLEO);
    const r = await nucleo.match("catalogo.json");
    if (!r) return;
    const cat = await r.json();
    const fotos = await caches.open(FOTOS);
    for (const c of cat) {
      if (await fotos.match(c.imagen)) continue;
      try { const resp = await fetch(c.imagen); if (resp.ok) await fotos.put(c.imagen, resp); } catch (_) { return; } // sin red: se reintenta otro día
    }
  } catch (_) { /* nada crítico */ }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes("/api/")) return; // externo y API: siempre a la red

  // Páginas: primero la red (para ver cambios), si no hay red, la copia guardada
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("index.html", { ignoreSearch: true })));
    return;
  }
  // Fotos del catálogo: primero la copia guardada
  if (url.pathname.includes("/img/")) {
    e.respondWith((async () => {
      const fotos = await caches.open(FOTOS);
      const hit = await fotos.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { const resp = await fetch(req); if (resp.ok) fotos.put(req, resp.clone()); return resp; }
      catch (_) { return new Response("", { status: 504 }); }
    })());
    return;
  }
  // Resto (librerías, IA, datos): copia guardada de esta versión y, si falta, la red
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const resp = await fetch(req);
      if (resp.ok) (await caches.open(NUCLEO)).put(req, resp.clone());
      return resp;
    } catch (_) { return new Response("", { status: 504 }); }
  })());
});
