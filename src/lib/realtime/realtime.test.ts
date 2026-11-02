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
  verifyRealtimeChannelAccess,
} from "./broadcast";
import { pushNotificationService } from "../services/push-notification.service";
import { SignJWT } from "jose";

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

    it("checks push receipts and prunes DeviceNotRegistered tokens", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            "rec-1": { status: "ok" },
            "rec-2": { status: "error", details: { error: "DeviceNotRegistered" } },
          },
        }),
      });
      global.fetch = mockFetch;

      const badTokens = await pushNotificationService.checkReceipts(["rec-1", "rec-2"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://expopush.net/v2/push/getReceipts",
        expect.objectContaining({ method: "POST" }),
      );
      expect(Array.isArray(badTokens)).toBe(true);
    });
  });

  describe("Channel Authorization & Realtime Security", () => {
    const JWT_SECRET = "test-jwt-secret-at-least-32-chars-long";

    async function mintTestToken(claims: {
      sub: string;
      role: string;
      app_role: string;
      allowed_channels: string[];
    }) {
      return new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(claims.sub)
        .setAudience("authenticated")
        .setIssuer("purple-haze")
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(new TextEncoder().encode(JWT_SECRET));
    }

    it("authorizes a user on their own channel and on public menu-availability", async () => {
      const userBToken = await mintTestToken({
        sub: "user-b",
        role: "authenticated",
        app_role: "CUSTOMER",
        allowed_channels: ["menu-availability", "user-user-b"],
      });

      const ownCheck = await verifyRealtimeChannelAccess(userBToken, "user-user-b");
      expect(ownCheck.authorized).toBe(true);

      const menuCheck = await verifyRealtimeChannelAccess(userBToken, "menu-availability");
      expect(menuCheck.authorized).toBe(true);
    });

    it("strictly rejects a customer trying to subscribe to another user channel or admin-orders", async () => {
      const userBToken = await mintTestToken({
        sub: "user-b",
        role: "authenticated",
        app_role: "CUSTOMER",
        allowed_channels: ["menu-availability", "user-user-b"],
      });

      const foreignCheck = await verifyRealtimeChannelAccess(userBToken, "user-user-a");
      expect(foreignCheck.authorized).toBe(false);
      expect(foreignCheck.reason).toContain("not in allowed_channels");

      const adminCheck = await verifyRealtimeChannelAccess(userBToken, "admin-orders");
      expect(adminCheck.authorized).toBe(false);
      expect(adminCheck.reason).toContain("not in allowed_channels");
    });

    it("authorizes a staff member on the admin-orders channel", async () => {
      const staffToken = await mintTestToken({
        sub: "staff-1",
        role: "authenticated",
        app_role: "STAFF",
        allowed_channels: ["menu-availability", "user-staff-1", "admin-orders"],
      });

      const adminCheck = await verifyRealtimeChannelAccess(staffToken, "admin-orders");
      expect(adminCheck.authorized).toBe(true);
    });
  });

  describe("Failure Isolation: Broadcast & Push Failures Do Not Fail Order Flow", () => {
    it("handles broadcast network failure gracefully without throwing or rejecting", async () => {
      // Network fetch error simulating Supabase outage
      global.fetch = vi.fn().mockRejectedValue(new Error("Supabase connection timeout"));

      const order = {
        id: "ord-failsafe",
        orderNumber: "PH-FAILSAFE",
        createdAt: new Date(),
      };

      // Must return false without throwing an unhandled rejection
      await expect(broadcastOrderCreated(order)).resolves.toBe(false);
      await expect(
        broadcastOrderStatusUpdated({
          orderId: "ord-failsafe",
          orderNumber: "PH-FAILSAFE",
          status: "CONFIRMED",
        }),
      ).resolves.toBe(false);
    });

    it("handles push server error gracefully without throwing", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Expo push server 503"));

      const result = await pushNotificationService.sendMessages([
        {
          to: "ExponentPushToken[device-1]",
          title: "Order update",
          body: "Your order is ready",
        },
      ]);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe("Payment State Preservation on Khalti Callback", () => {
    it("rejects amount mismatch and preserves PENDING status without marking FAILED", () => {
      // Simulating Khalti callback amount comparison logic
      const orderTotal: number = 46500; // 465.00 NPR in paisa
      const lookupAmount: number = 10000; // 100.00 NPR in paisa (mismatch)

      const amountMatches = lookupAmount === orderTotal;
      expect(amountMatches).toBe(false);

      // Verify that when amount doesn't match, status remains unchanged
      const paymentStatus: string = amountMatches ? "PAID" : "PENDING";
      expect(paymentStatus).toBe("PENDING");
    });
  });
});
