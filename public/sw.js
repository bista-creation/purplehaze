const CACHE_VERSION = "purple-haze-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/offline.html";

// Only public, non-personalised pages are eligible for the navigation cache.
// Order views, tokens, account pages and checkout are never stored here.
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/menu",
  "/about",
  "/gallery",
  "/contact",
  "/reservations",
  "/events",
  "/terms",
  "/privacy",
]);

const PRIVATE_PREFIXES = [
  "/api/",
  "/admin",
  "/account",
  "/checkout",
  "/order",
  "/track",
  "/print",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/placeholders/dish.jpg",
];

function isCacheablePage(url) {
  return url.search === "" && PUBLIC_PAGE_PATHS.has(url.pathname);
}

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
  );
}

function isCacheableResponse(response) {
  if (!response || !response.ok) return false;
  if (response.headers.has("set-cookie")) return false;
  const cacheControl = (
    response.headers.get("cache-control") ?? ""
  ).toLowerCase();
  return (
    !cacheControl.includes("no-store") && !cacheControl.includes("private")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
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
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (
    event.data === "CLEAR_PAGE_CACHE" ||
    event.data?.type === "CLEAR_PAGE_CACHE"
  ) {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    const cacheable = isCacheablePage(url);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (cacheable && isCacheableResponse(response)) {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(PAGE_CACHE)
                .then((cache) => cache.put(request, copy))
                .catch(() => undefined),
            );
          }
          return response;
        })
        .catch(async () => {
          if (cacheable) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (isCacheableResponse(response)) {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, copy))
                .catch(() => undefined),
            );
          }
          return response;
        });
      }),
    );
  }
});
