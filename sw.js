// Offline cache for the Driver Seat app. Bump VERSION when files change.
const VERSION = "driver-v2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("driver-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page: network first so updates show up, cache when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(new URL("./", self.registration.scope).href, copy));
        }
        return res;
      }).catch(() => caches.match(new URL("./", self.registration.scope).href))
    );
    return;
  }

  // Own files and Google Fonts: cache first, fill cache on miss.
  const ok = url.origin === location.origin
    ? url.href.startsWith(self.registration.scope)
    : /^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!ok) return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
