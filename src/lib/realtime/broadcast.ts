import "server-only";
import { SignJWT } from "jose";
import { getSupabaseRealtimeConfig } from "@/lib/supabase-realtime";
import {
  REALTIME_CHANNELS,
  REALTIME_EVENTS,
  type BookingUpdatedPayload,
  type MenuUpdatedPayload,
  type OrderCreatedPayload,
  type OrderStatusUpdatedPayload,
} from "@/lib/shared/realtime";

async function getBroadcastAuthToken(): Promise<string | null> {
  const config = getSupabaseRealtimeConfig();
  if (!config) return null;

  try {
    const token = await new SignJWT({
      role: "service_role",
      app_role: "SYSTEM",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject("backend-service")
      .setAudience("authenticated")
      .setIssuer("purple-haze")
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(new TextEncoder().encode(config.jwtSecret));

    return token;
  } catch {
    return config.anonKey;
  }
}

export async function broadcastEvent(
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const config = getSupabaseRealtimeConfig();
  if (!config) {
    // Realtime not configured (e.g. test environment or local without Supabase)
    return false;
  }

  const token = await getBroadcastAuthToken();
  if (!token) return false;

  const endpoint = `${config.url}/realtime/v1/api/broadcast`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event,
            payload,
          },
        ],
      }),
    });

    return res.ok;
  } catch (error) {
    console.warn(`[Realtime Broadcast] Failed to send event '${event}' to topic '${topic}':`, error);
    return false;
  }
}

export async function broadcastOrderCreated(order: {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  type: string;
  paymentMethod: string;
  createdAt: Date;
}) {
  const payload: OrderCreatedPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    total: order.total,
    type: order.type,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
  };

  return broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderCreated, payload);
}

export async function broadcastOrderStatusUpdated(params: {
  orderId: string;
  orderNumber: string;
  status: string;
  userId?: string | null;
  previousStatus?: string;
  note?: string | null;
}) {
  const payload: OrderStatusUpdatedPayload = {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    status: params.status,
    previousStatus: params.previousStatus,
    note: params.note,
    updatedAt: new Date().toISOString(),
  };

  // Broadcast to admin channel, order-specific channel, and user-specific channel
  await Promise.allSettled([
    broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, payload),
    broadcastEvent(REALTIME_CHANNELS.orderTracking(params.orderId), REALTIME_EVENTS.orderStatusUpdated, payload),
    params.userId
      ? broadcastEvent(REALTIME_CHANNELS.userOrders(params.userId), REALTIME_EVENTS.orderStatusUpdated, payload)
      : Promise.resolve(false),
  ]);
}

export async function broadcastMenuUpdated(update: MenuUpdatedPayload) {
  return broadcastEvent(REALTIME_CHANNELS.publicMenu, REALTIME_EVENTS.menuUpdated, update);
}

export async function broadcastBookingUpdated(params: {
  id: string;
  kind: "reservation" | "event";
  name: string;
  status: string;
  date: Date;
}) {
  const payload: BookingUpdatedPayload = {
    id: params.id,
    kind: params.kind,
    name: params.name,
    status: params.status,
    date: params.date.toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return broadcastEvent(REALTIME_CHANNELS.adminBookings, REALTIME_EVENTS.bookingUpdated, payload);
}
