const CACHE_NAME = "bookly-static-v1";
const PRECACHE_URLS = [
  "/offline.html",
  "/icons/bookly-192.png",
  "/icons/bookly-512.png",
  "/icons/bookly-180.png",
  "/images/bookly-services.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith("bookly-static-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if ("onLine" in self.navigator && self.navigator.onLine === false) {
      event.respondWith(caches.open(CACHE_NAME)
        .then((cache) => cache.match("/offline.html"))
        .then((response) => response || Response.error()));
      return;
    }

    event.respondWith(fetch(request, { cache: "no-store" }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match("/offline.html")) || Response.error();
    }));
    return;
  }

  const isNextStatic = url.pathname.startsWith("/_next/static/");
  const isBooklyStatic = url.pathname === "/images/bookly-services.png" ||
    url.pathname.startsWith("/icons/bookly-") || url.pathname === "/favicon.ico";
  if (!isNextStatic && !isBooklyStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
