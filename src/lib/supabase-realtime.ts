import "server-only";
import { SignJWT } from "jose";
import type { Role } from "@/lib/constants";

type RealtimeConfig = {
  url: string;
  anonKey: string;
  jwtSecret: string;
};

export function getSupabaseRealtimeConfig(): RealtimeConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!url || !anonKey || !jwtSecret) return null;
  return { url, anonKey, jwtSecret };
}

/**
 * Supabase Realtime Postgres Changes authorizes each channel/row through RLS using
 * the JWT sent by the client. Auth.js/API session remains the source of truth;
 * this token carries the verified identity, app_role, and short expiry.
 */
export async function signRealtimeToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  const config = getSupabaseRealtimeConfig();
  if (!config) return null;

  const token = await new SignJWT({
    role: "authenticated",
    app_role: user.role as Role,
    user_metadata: {
      role: user.role,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setAudience("authenticated")
    .setIssuer("purple-haze")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(config.jwtSecret));

  return { token, expiresInSeconds: 300 };
}

export const signStaffRealtimeToken = signRealtimeToken;

/**
 * Mint a scoped, short-lived (10m) Realtime JWT for customer order tracking.
 * Strictly contains `allowed_channels: ["order-tracking-{orderId}"]`.
 * Omits `app_role` entirely and assigns a random guest ID if unauthenticated.
 */
export async function signCustomerTrackingToken(input: {
  orderId: string;
  userId?: string;
}) {
  const config = getSupabaseRealtimeConfig();
  if (!config) return null;

  const subject = input.userId || `guest-${crypto.randomUUID()}`;
  const channel = `order-tracking-${input.orderId}`;

  const token = await new SignJWT({
    role: "authenticated",
    allowed_channels: [channel],
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setAudience("authenticated")
    .setIssuer("purple-haze")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(config.jwtSecret));

  return { token, expiresInSeconds: 600, channel };
}
