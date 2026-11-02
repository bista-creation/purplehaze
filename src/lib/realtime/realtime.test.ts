import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      pushToken: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/supabase-realtime", () => ({
  getSupabaseRealtimeConfig: vi.fn(() => ({
    url: "https://test-project.supabase.co",
    anonKey: "test-anon-key",
    jwtSecret: "test-jwt-secret-at-least-32-chars-long",
  })),
}));

import {
  REALTIME_CHANNELS,
  REALTIME_EVENTS,
} from "@/lib/shared/realtime";
import {
  broadcastEvent,
  broadcastOrderCreated,
  broadcastOrderStatusUpdated,
  broadcastMenuUpdated,
} from "./broadcast";
import { pushNotificationService } from "../services/push-notification.service";

describe("Realtime Sync & Push Notification Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Realtime Channel & Event Contracts", () => {
    it("defines consistent channel naming scheme", () => {
      expect(REALTIME_CHANNELS.adminOrders).toBe("orders:admin");
      expect(REALTIME_CHANNELS.adminBookings).toBe("bookings:admin");
      expect(REALTIME_CHANNELS.publicMenu).toBe("menu:public");
      expect(REALTIME_CHANNELS.orderTracking("ord-123")).toBe("orders:ord-123");
      expect(REALTIME_CHANNELS.userOrders("user-456")).toBe("orders:user:user-456");
    });

    it("defines consistent event constants across platforms", () => {
      expect(REALTIME_EVENTS.orderCreated).toBe("order.created");
      expect(REALTIME_EVENTS.orderStatusUpdated).toBe("order.status_updated");
      expect(REALTIME_EVENTS.menuUpdated).toBe("menu.updated");
      expect(REALTIME_EVENTS.bookingUpdated).toBe("booking.updated");
      expect(REALTIME_EVENTS.promotionUpdated).toBe("promotion.updated");
    });
  });

  describe("Supabase Realtime Broadcast Publisher", () => {
    it("broadcasts event to Supabase Realtime REST API with valid headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      const success = await broadcastEvent("orders:admin", "order.created", {
        orderId: "ord-1",
        total: 1500,
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-project.supabase.co/realtime/v1/api/broadcast",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: "test-anon-key",
            "Content-Type": "application/json",
          }),
        }),
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages).toHaveLength(1);
      expect(requestBody.messages[0].topic).toBe("orders:admin");
      expect(requestBody.messages[0].event).toBe("order.created");
      expect(requestBody.messages[0].payload.orderId).toBe("ord-1");
    });

    it("formats order.created broadcast with standard fields", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const order = {
        id: "ord-99",
        orderNumber: "PH-123456",
        customerName: "Sita Sharma",
        total: 250000,
        type: "DELIVERY",
        paymentMethod: "COD",
        createdAt: new Date("2026-11-02T12:00:00Z"),
      };

      await broadcastOrderCreated(order);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].topic).toBe("orders:admin");
      expect(requestBody.messages[0].payload.orderNumber).toBe("PH-123456");
      expect(requestBody.messages[0].payload.customerName).toBe("Sita Sharma");
    });

    it("broadcasts order.status_updated to admin, order channel, and user channel", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastOrderStatusUpdated({
        orderId: "ord-100",
        orderNumber: "PH-100",
        status: "PREPARING",
        userId: "user-100",
        previousStatus: "CONFIRMED",
        note: "Chefs are preparing",
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      const topics = mockFetch.mock.calls.map(
        (call: unknown[]) => JSON.parse((call[1] as { body: string }).body).messages[0].topic,
      );
      expect(topics).toContain("orders:admin");
      expect(topics).toContain("orders:ord-100");
      expect(topics).toContain("orders:user:user-100");
    });

    it("broadcasts menu.updated to public channel", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastMenuUpdated({
        type: "dish_availability",
        dishId: "dish-5",
        dishName: "Chicken Sekuwa",
        isAvailable: false,
        updatedAt: new Date().toISOString(),
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].topic).toBe("menu:public");
      expect(requestBody.messages[0].event).toBe("menu.updated");
      expect(requestBody.messages[0].payload.dishName).toBe("Chicken Sekuwa");
      expect(requestBody.messages[0].payload.isAvailable).toBe(false);
    });
  });

  describe("Expo Push Notification Service", () => {
    it("validates Expo push token formats accurately", () => {
      expect(pushNotificationService.isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
      expect(pushNotificationService.isExpoPushToken("ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
      expect(pushNotificationService.isExpoPushToken("invalid-push-token")).toBe(false);
      expect(pushNotificationService.isExpoPushToken("")).toBe(false);
    });

    it("sends batch push messages to Expo push server", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ status: "ok", id: "ticket-1" }],
        }),
      });
      global.fetch = mockFetch;

      const result = await pushNotificationService.sendMessages([
        {
          to: "ExponentPushToken[test-token-1]",
          title: "Order Update",
          body: "Your order is ready!",
        },
      ]);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://expopush.net/v2/push/send",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("automatically deletes unregistered device tokens when Expo returns DeviceNotRegistered", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              status: "error",
              message: "DeviceNotRegistered",
              details: { error: "DeviceNotRegistered" },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await pushNotificationService.sendMessages([
        {
          to: "ExponentPushToken[stale-token]",
          title: "Order Update",
          body: "Test message",
        },
      ]);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.unregisteredTokens).toContain("ExponentPushToken[stale-token]");
      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ["ExponentPushToken[stale-token]"] } },
      });
    });

    it("sends appropriate push notifications for order status transitions", async () => {
      mockPrisma.pushToken.findMany.mockResolvedValue([
        { token: "ExponentPushToken[valid-device-1]" },
      ]);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ status: "ok" }],
        }),
      });
      global.fetch = mockFetch;

      await pushNotificationService.sendOrderStatusNotification({
        userId: "user-123",
        orderId: "ord-1",
        orderNumber: "PH-9999",
        status: "OUT_FOR_DELIVERY",
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body[0].title).toBe("Rider on the way!");
      expect(body[0].body).toContain("PH-9999");
      expect(body[0].data.status).toBe("OUT_FOR_DELIVERY");
    });
  });
});
