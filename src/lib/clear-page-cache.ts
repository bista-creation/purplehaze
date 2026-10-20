const PAGE_CACHE_SUFFIX = "-pages";

/**
 * Best-effort removal of cached page navigations. Sensitive pages are never
 * cached by the current service worker, but this also removes caches left by
 * older app versions and keeps a shared browser clean after sign-out.
 */
export async function clearPageCache() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: "CLEAR_PAGE_CACHE",
      });
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("purple-haze-") && key.endsWith(PAGE_CACHE_SUFFIX),
          )
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    // Cache cleanup is best-effort and must never block sign-out.
  }
}
