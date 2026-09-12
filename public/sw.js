// Offline cache: network-first for everything, falling back to cache only
// when the network fails (offline). Previously JS/CSS/images were cache-first
// forever — once a bundle was cached, it never refreshed from the network
// again, even across new deploys. That's the classic "my fix doesn't seem to
// take effect" PWA bug: bump CACHE below whenever this file changes, so
// already-installed clients purge their stale cache instead of silently
// running old code forever.
const CACHE = "fitsaathi-v2";
const OFFLINE_URLS = ["/", "/challenges", "/quest", "/fitroute", "/profile"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
