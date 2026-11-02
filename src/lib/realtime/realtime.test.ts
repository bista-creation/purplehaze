import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      pushToken: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
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

describe("Realtime Sync & Push Notification Architecture (Phase c)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Realtime Channel & Event Contracts", () => {
    it("defines user-{userId}, admin-orders, and menu-availability channels", () => {
      expect(REALTIME_CHANNELS.adminOrders).toBe("admin-orders");
      expect(REALTIME_CHANNELS.menuAvailability).toBe("menu-availability");
      expect(REALTIME_CHANNELS.userChannel("user-123")).toBe("user-user-123");
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

      const success = await broadcastEvent("admin-orders", "order.created", {
        orderId: "ord-1",
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
      expect(requestBody.messages[0].topic).toBe("admin-orders");
      expect(requestBody.messages[0].event).toBe("order.created");
      expect(requestBody.messages[0].payload.orderId).toBe("ord-1");
    });

    it("ensures broadcast payloads contain only event type + IDs (no personal data)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const order = {
        id: "ord-99",
        orderNumber: "PH-123456",
        userId: "usr-456",
        createdAt: new Date("2026-11-02T12:00:00Z"),
      };

      await broadcastOrderCreated(order);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].topic).toBe("admin-orders");
      const payload = requestBody.messages[0].payload;

      expect(payload.orderId).toBe("ord-99");
      expect(payload.orderNumber).toBe("PH-123456");
      expect(payload.userId).toBe("usr-456");
      // Must NOT contain personal details
      expect(payload).not.toHaveProperty("customerName");
      expect(payload).not.toHaveProperty("phone");
      expect(payload).not.toHaveProperty("email");
      expect(payload).not.toHaveProperty("deliveryAddress");
    });

    it("broadcasts order.status_updated to admin-orders and user-{userId} without personal data", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastOrderStatusUpdated({
        orderId: "ord-100",
        orderNumber: "PH-100",
        status: "PREPARING",
        userId: "user-100",
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const topics = mockFetch.mock.calls.map(
        (call: unknown[]) => JSON.parse((call[1] as { body: string }).body).messages[0].topic,
      );
      expect(topics).toContain("admin-orders");
      expect(topics).toContain("user-user-100");

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].payload;
      expect(payload.orderId).toBe("ord-100");
      expect(payload.status).toBe("PREPARING");
      expect(payload).not.toHaveProperty("customerName");
    });

    it("broadcasts menu.updated to menu-availability channel", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastMenuUpdated({
        type: "dish_availability",
        dishId: "dish-5",
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].topic).toBe("menu-availability");
      expect(requestBody.messages[0].event).toBe("menu.updated");
      expect(requestBody.messages[0].payload.dishId).toBe("dish-5");
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
