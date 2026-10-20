const LOCAL_APP_URL = "http://localhost:3000";

/**
 * Normalises a public application origin for links, metadata and OAuth.
 *
 * A trailing slash or a duplicated path slash produces callback URLs such as
 * `https://example.com//api/auth/callback/google`, which Google rejects
 * because OAuth redirect URIs must match exactly.
 */
export function normalizeAppUrl(
  raw: string | null | undefined,
  fallback = LOCAL_APP_URL,
) {
  if (!raw?.trim()) return fallback;

  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback;
    }

    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function isLocalhostAppUrl(raw: string | null | undefined) {
  if (!raw?.trim()) return false;

  try {
    const { hostname } = new URL(raw.trim());
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function googleCallbackUrl(appUrl?: string | null) {
  return `${normalizeAppUrl(appUrl)}/api/auth/callback/google`;
}
