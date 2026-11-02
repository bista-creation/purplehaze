import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { getAuthContext } from "@/lib/api/auth-context";
import { getSupabaseRealtimeConfig } from "@/lib/supabase-realtime";
import { orderService } from "@/lib/services/order.service";
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
  const { orderId, orderNumber, phone, publicToken } = body as {
    orderId?: string;
    orderNumber?: string;
    phone?: string;
    publicToken?: string;
  };

  const allowedChannels: string[] = [REALTIME_CHANNELS.publicMenu];

  if (user) {
    allowedChannels.push(REALTIME_CHANNELS.userOrders(user.id));
    if (user.role === "ADMIN" || user.role === "STAFF") {
      allowedChannels.push(REALTIME_CHANNELS.adminOrders);
      allowedChannels.push(REALTIME_CHANNELS.adminBookings);
    }
  }

  // Authorize guest order tracking channel if guest credentials match
  if (orderId) {
    allowedChannels.push(REALTIME_CHANNELS.orderTracking(orderId));
  } else if (orderNumber && phone) {
    const verified = await orderService.trackOrder(orderNumber, phone);
    if (verified) {
      allowedChannels.push(REALTIME_CHANNELS.orderTracking(verified.id));
    }
  } else if (orderNumber && publicToken) {
    const verified = await orderService.getOrderByNumber(orderNumber, null, publicToken);
    if (verified) {
      allowedChannels.push(REALTIME_CHANNELS.orderTracking(verified.id));
    }
  }

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
