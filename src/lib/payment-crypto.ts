import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure eSewa crypto/parsing helpers. Kept free of `server-only` and Prisma so
 * they can be unit tested and reused by route handlers.
 */

export function signEsewa(
  message: string,
  secret = process.env.ESEWA_SECRET_KEY ?? "",
) {
  return createHmac("sha256", secret).update(message).digest("base64");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * eSewa signs an ordered subset of fields. Rebuild the exact message from the
 * signed_field_names list before comparing the signature.
 */
export function verifyEsewaSignature(
  payload: Record<string, string>,
  secret = process.env.ESEWA_SECRET_KEY ?? "",
) {
  const signedFields = (payload.signed_field_names ?? "").split(",");
  if (signedFields.length === 0) return false;
  const message = signedFields
    .map((field) => `${field}=${payload[field] ?? ""}`)
    .join(",");
  const expected = signEsewa(message, secret);
  return safeEqual(expected, payload.signature ?? "");
}

export function parseEsewaCallbackData(data: string) {
  try {
    // Query-string decoding turns an unescaped "+" from standard base64 into
    // a space. Restore it before decoding.
    const normalized = data.trim().replace(/ /g, "+");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const entries = Object.entries(parsed)
      .filter((entry): entry is [string, string | number | boolean] =>
        ["string", "number", "boolean"].includes(typeof entry[1]),
      )
      .map(([key, value]) => [key, String(value)]);
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

/**
 * eSewa formats amounts with thousands separators in callback payloads
 * (for example "1,000.0"). Number.parseFloat alone would read that as 1.
 */
export function parseEsewaAmount(value: string | number | undefined | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (value === undefined || value === null) return NaN;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return NaN;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}
