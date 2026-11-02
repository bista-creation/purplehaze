/**
 * Shared Realtime contracts for Purple Haze Restro & Garden.
 * Used by web frontend, mobile app, and backend services.
 */

export const REALTIME_CHANNELS = {
  adminOrders: "orders:admin",
  adminBookings: "bookings:admin",
  publicMenu: "menu:public",
  orderTracking: (orderId: string) => `orders:${orderId}`,
  userOrders: (userId: string) => `orders:user:${userId}`,
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

export type OrderCreatedPayload = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  type: string;
  paymentMethod: string;
  createdAt: string;
};

export type OrderStatusUpdatedPayload = {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  note?: string | null;
  updatedAt: string;
};

export type MenuUpdatedPayload = {
  type: "dish_availability" | "dish_price" | "category_updated";
  dishId?: string;
  dishName?: string;
  isAvailable?: boolean;
  price?: number;
  categoryId?: string;
  updatedAt: string;
};

export type BookingUpdatedPayload = {
  id: string;
  kind: "reservation" | "event";
  name: string;
  status: string;
  date: string;
  updatedAt: string;
};
