/**
 * Shared Realtime contracts for Purple Haze Restro & Garden.
 * Used by web frontend, mobile app, and backend services.
 */

export const REALTIME_CHANNELS = {
  // Canonical Phase (c) channels
  adminOrders: "admin-orders",
  menuAvailability: "menu-availability",
  userChannel: (userId: string) => `user-${userId}`,

  // Compatibility aliases
  publicMenu: "menu-availability",
  adminBookings: "admin-orders",
  orderTracking: (orderId: string) => `order-${orderId}`,
  userOrders: (userId: string) => `user-${userId}`,
} as const;

export const REALTIME_EVENTS = {
  orderCreated: "order.created",
  orderStatusUpdated: "order.status_updated",
  menuUpdated: "menu.updated",
  bookingUpdated: "booking.updated",
  promotionUpdated: "promotion.updated",
} as const;

export type RealtimeEventName =
  typeof REALTIME_EVENTS[keyof typeof REALTIME_EVENTS];

/**
 * Broadcast payloads contain ONLY event type + IDs, NO personal data.
 * Clients refetch details through the authenticated REST API.
 */
export type OrderCreatedPayload = {
  event: typeof REALTIME_EVENTS.orderCreated;
  orderId: string;
  orderNumber: string;
  userId?: string;
  createdAt: string;
};

export type OrderStatusUpdatedPayload = {
  event: typeof REALTIME_EVENTS.orderStatusUpdated;
  orderId: string;
  orderNumber: string;
  status: string;
  userId?: string;
  updatedAt: string;
};

export type MenuUpdatedPayload = {
  event: typeof REALTIME_EVENTS.menuUpdated;
  type: "dish_availability" | "dish_price" | "category_updated";
  dishId?: string;
  dishName?: string;
  categoryId?: string;
  isAvailable?: boolean;
  price?: number;
  updatedAt: string;
};

export type BookingUpdatedPayload = {
  event: typeof REALTIME_EVENTS.bookingUpdated;
  bookingId: string;
  kind: "reservation" | "event";
  status: string;
  userId?: string;
  updatedAt: string;
};
