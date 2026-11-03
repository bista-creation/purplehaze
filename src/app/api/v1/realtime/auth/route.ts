import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { getAuthContext } from "@/lib/api/auth-context";
import { getSupabaseRealtimeConfig } from "@/lib/supabase-realtime";
import { jsonError, jsonOk } from "@/lib/api/response";
import { REALTIME_CHANNELS } from "@/lib/shared/realtime";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const config = getSupabaseRealtimeConfig();
  if (!config) {
    return jsonError("REALTIME_DISABLED", "Realtime service is not configured on this environment.", 503);
  }

  const user = await getAuthContext(req);
  const body = await req.json().catch(() => ({}));
  const requestedOrderId = body?.orderId || req.nextUrl.searchParams.get("orderId");

  // 1. menu-availability is public
  const allowedChannels: string[] = [REALTIME_CHANNELS.menuAvailability];

  // 2. Order-specific tracking channels (if requested)
  if (requestedOrderId && typeof requestedOrderId === "string") {
    allowedChannels.push(REALTIME_CHANNELS.orderTracking(requestedOrderId));
    allowedChannels.push(`order-tracking-${requestedOrderId}`);
  }

  // 3. Private channel authorization
  if (user) {
    // User can only join their own user-{userId} channel
    allowedChannels.push(REALTIME_CHANNELS.userChannel(user.id));

    // Only STAFF or ADMIN can join admin-orders
    if (user.role === "ADMIN" || user.role === "STAFF") {
      allowedChannels.push(REALTIME_CHANNELS.adminOrders);
    }
  }

  // Mint short-lived Realtime token (15 mins) with authorization claims
  const token = await new SignJWT({
    role: user ? "authenticated" : "anon",
    app_role: user?.role ?? "GUEST",
    allowed_channels: allowedChannels,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user?.id ?? "guest-client")
    .setAudience("authenticated")
    .setIssuer("purple-haze")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(config.jwtSecret));

  return jsonOk({
    url: config.url,
    anonKey: config.anonKey,
    token,
    expiresInSeconds: 900,
    channels: allowedChannels,
  });
}
