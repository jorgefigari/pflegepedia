/* Pflegepedia Service Worker: macht besuchte Seiten offline verfügbar und lädt wiederkehrende Dateien aus dem Speicher. */
const VERSION = "pp-v1";
const CORE = ["/", "/lernpfade/", "/manifest.webmanifest", "/icons/favicon.svg", "/icons/icon-192.png",
  "/fonts/newsreader-latin-500-normal.woff2", "/fonts/newsreader-latin-500-italic.woff2", "/fonts/newsreader-latin-600-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (/\.mp3$/.test(u.pathname) || u.pathname.startsWith("/audio/")) return; /* Audios direkt vom Netz */
  if (r.mode === "navigate") {
    /* Seiten: zuerst Netz (immer aktuell), sonst gespeicherte Version, sonst Startseite */
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(ca => ca.put(r, c)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match("/"))));
    return;
  }
  if (/\/(app\.[0-9a-f]+\.js|fonts\/|icons\/)/.test(u.pathname)) {
    /* Dateien mit festem Inhalt: zuerst Speicher */
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(ca => ca.put(r, c)); return res; })));
  }
});
