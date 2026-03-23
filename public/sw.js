const CACHE_VERSION = "mountrack-pwa-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_ASSETS = [
  "/",
  "/login",
  "/subscribe",
  "/subscription",
  "/offline.html",
  "/favicon.svg",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function shouldBypass(request, url) {
  if (request.method !== "GET") {
    return true;
  }

  if (url.origin !== self.location.origin) {
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    return true;
  }

  if (url.pathname.startsWith("/_next/webpack-hmr")) {
    return true;
  }

  return false;
}

async function putInRuntimeCache(request, response) {
  if (!response || !response.ok || response.type === "opaque") {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (shouldBypass(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => putInRuntimeCache(request, response))
        .catch(async () => {
          const cachedPage = await caches.match(request);
          return cachedPage || caches.match("/offline.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => putInRuntimeCache(request, response))
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    }),
  );
});
