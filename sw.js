/* Service worker — Ruta de inspección de estructuras
   - Documento (index.html): "red primero" -> al abrir con conexión recibes la
     última versión; sin conexión, se sirve la copia guardada en caché.
   - Resto de recursos del mismo origen (iconos, manifiesto): "caché primero".
   - Recursos externos (teselas del mapa, OSRM, Google Maps, CDN): directos a la red;
     sin conexión, la propia app degrada con elegancia (esquema + línea recta). */
const CACHE = "ruta-inspeccion-v5_2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // externos: red directa

  const isDoc = req.mode === "navigate" || req.destination === "document";
  if (isDoc) {
    // red primero (para recibir actualizaciones), con respaldo a caché sin conexión
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // caché primero para el resto del mismo origen
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
