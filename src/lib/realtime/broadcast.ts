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

/**
 * Broadcast new order event to admin-orders channel.
 * Contains only event type + IDs (no personal data).
 */
export async function broadcastOrderCreated(order: {
  id: string;
  orderNumber: string;
  userId?: string | null;
  createdAt: Date;
}) {
  const payload: OrderCreatedPayload = {
    event: REALTIME_EVENTS.orderCreated,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId || undefined,
    createdAt: order.createdAt.toISOString(),
  };

  return broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderCreated, payload);
}

/**
 * Broadcast order status update to admin-orders and user-{userId} channels.
 * Contains only event type + IDs (no personal data).
 */
export async function broadcastOrderStatusUpdated(params: {
  orderId: string;
  orderNumber: string;
  status: string;
  userId?: string | null;
}) {
  const payload: OrderStatusUpdatedPayload = {
    event: REALTIME_EVENTS.orderStatusUpdated,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    status: params.status,
    userId: params.userId || undefined,
    updatedAt: new Date().toISOString(),
  };

  const tasks: Promise<boolean>[] = [
    broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, payload),
  ];

  if (params.userId) {
    tasks.push(
      broadcastEvent(REALTIME_CHANNELS.userChannel(params.userId), REALTIME_EVENTS.orderStatusUpdated, payload),
    );
  }

  const results = await Promise.allSettled(tasks);
  return results.some((r) => r.status === "fulfilled" && r.value === true);
}

/**
 * Broadcast menu availability/price updates to menu-availability channel.
 */
export async function broadcastMenuUpdated(update: {
  type: "dish_availability" | "dish_price" | "category_updated";
  dishId?: string;
  dishName?: string;
  categoryId?: string;
  isAvailable?: boolean;
  price?: number;
  updatedAt?: string;
}) {
  const payload: MenuUpdatedPayload = {
    event: REALTIME_EVENTS.menuUpdated,
    type: update.type,
    dishId: update.dishId,
    dishName: update.dishName,
    categoryId: update.categoryId,
    isAvailable: update.isAvailable,
    price: update.price,
    updatedAt: update.updatedAt || new Date().toISOString(),
  };

  return broadcastEvent(REALTIME_CHANNELS.menuAvailability, REALTIME_EVENTS.menuUpdated, payload);
}

/**
 * Broadcast booking updates to admin-orders and user-{userId} channels.
 * Contains only event type + IDs (no personal data).
 */
export async function broadcastBookingUpdated(params: {
  id: string;
  kind: "reservation" | "event";
  status: string;
  userId?: string | null;
}) {
  const payload: BookingUpdatedPayload = {
    event: REALTIME_EVENTS.bookingUpdated,
    bookingId: params.id,
    kind: params.kind,
    status: params.status,
    userId: params.userId || undefined,
    updatedAt: new Date().toISOString(),
  };

  const tasks: Promise<boolean>[] = [
    broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.bookingUpdated, payload),
  ];

  if (params.userId) {
    tasks.push(
      broadcastEvent(REALTIME_CHANNELS.userChannel(params.userId), REALTIME_EVENTS.bookingUpdated, payload),
    );
  }

  const results = await Promise.allSettled(tasks);
  return results.some((r) => r.status === "fulfilled" && r.value === true);
}
