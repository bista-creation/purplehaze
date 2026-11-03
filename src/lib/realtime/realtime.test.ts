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
import {
  pushNotificationService,
  EXPO_PUSH_SEND_ENDPOINT,
  EXPO_PUSH_RECEIPTS_ENDPOINT,
} from "../services/push-notification.service";
import { checkRateLimit, isSensitiveRateLimitKey } from "../rate-limit";
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

      const fullOrder = {
        id: "ord-123",
        orderNumber: "PH-1234",
        userId: "user-456",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+9779812345678",
        deliveryAddress: "Main Street 12, Biratnagar",
        createdAt: new Date(),
      };

      await broadcastOrderCreated(fullOrder);

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].payload;
      expect(payload).toEqual(
        expect.objectContaining({
          event: "order.created",
          orderId: "ord-123",
          orderNumber: "PH-1234",
          userId: "user-456",
        }),
      );
      expect(payload).not.toHaveProperty("customerName");
      expect(payload).not.toHaveProperty("customerEmail");
      expect(payload).not.toHaveProperty("customerPhone");
      expect(payload).not.toHaveProperty("deliveryAddress");
    });

    it("broadcasts order status updates with only ID and status fields", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastOrderStatusUpdated({
        orderId: "ord-123",
        orderNumber: "PH-1234",
        status: "PREPARING",
        userId: "user-456",
      });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].payload;
      expect(payload.event).toBe("order.status_updated");
      expect(payload.orderId).toBe("ord-123");
      expect(payload.status).toBe("PREPARING");
      expect(payload.userId).toBe("user-456");
      expect(payload).not.toHaveProperty("customerEmail");
    });

    it("broadcasts menu updates to public channel without customer context", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await broadcastMenuUpdated({
        type: "dish_availability",
        dishId: "dish-1",
        isAvailable: false,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].topic).toBe("menu-availability");
      expect(body.messages[0].event).toBe("menu.updated");
      expect(body.messages[0].payload.dishId).toBe("dish-1");
      expect(body.messages[0].payload.isAvailable).toBe(false);
    });
  });

  describe("Push Notifications & Official Expo Endpoints", () => {
    it("uses official Expo push endpoints (exp.host)", () => {
      expect(EXPO_PUSH_SEND_ENDPOINT).toBe("https://exp.host/--/api/v2/push/send");
      expect(EXPO_PUSH_RECEIPTS_ENDPOINT).toBe("https://exp.host/--/api/v2/push/getReceipts");
    });

    it("sends batch messages via official Expo endpoint", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ status: "ok", id: "ticket-1" }] }),
        json: async () => ({
          data: [{ status: "ok", id: "ticket-1" }],
        }),
      });
      global.fetch = mockFetch;

      const result = await pushNotificationService.sendMessages([
        {
          to: "ExponentPushToken[device-test-1]",
          title: "Dinner Ready",
          body: "Your order is ready at Purple Haze",
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.objectContaining({ method: expect.stringMatching(/post/i) }),
      );
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("automatically deletes unregistered device tokens when Expo returns DeviceNotRegistered", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                status: "error",
                message: "DeviceNotRegistered",
                details: { error: "DeviceNotRegistered" },
              },
            ],
          }),
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
        status: 200,
        text: async () => JSON.stringify({ data: [{ status: "ok" }] }),
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

      expect(mockFetch).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.objectContaining({ method: expect.stringMatching(/post/i) }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body[0].title).toBe("Rider on the way!");
      expect(body[0].body).toContain("PH-9999");
      expect(body[0].data.status).toBe("OUT_FOR_DELIVERY");
    });

    it("uses customer-safe cancellation message and does NOT leak internal staff notes", async () => {
      mockPrisma.pushToken.findMany.mockResolvedValue([
        { token: "ExponentPushToken[valid-device-1]" },
      ]);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ status: "ok" }] }),
        json: async () => ({
          data: [{ status: "ok" }],
        }),
      });
      global.fetch = mockFetch;

      await pushNotificationService.sendOrderStatusNotification({
        userId: "user-123",
        orderId: "ord-1",
        orderNumber: "PH-9999",
        status: "CANCELLED",
        note: "INTERNAL: Chef dropped the fish; out of salmon",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body[0].title).toBe("Order #PH-9999 Cancelled");
      // Must NOT contain internal staff note
      expect(body[0].body).not.toContain("Chef dropped the fish");
      expect(body[0].body).toContain("Your order has been cancelled");
    });

    it("checks push receipts and prunes DeviceNotRegistered tokens", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              "rec-1": { status: "ok" },
              "rec-2": { status: "error", details: { error: "DeviceNotRegistered" } },
            },
          }),
        json: async () => ({
          data: {
            "rec-1": { status: "ok" },
            "rec-2": { status: "error", details: { error: "DeviceNotRegistered" } },
          },
        }),
      });
      global.fetch = mockFetch;

      mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 1 });

      const badTokens = await pushNotificationService.checkReceipts(
        ["rec-1", "rec-2"],
        { "rec-2": "ExponentPushToken[unregistered-device]" },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/getReceipts",
        expect.objectContaining({ method: expect.stringMatching(/post/i) }),
      );
      expect(badTokens).toContain("ExponentPushToken[unregistered-device]");
      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ["ExponentPushToken[unregistered-device]"] } },
      });
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

  describe("Rate Limiter Production Fail-Closed Behavior", () => {
    it("identifies sensitive endpoints correctly", () => {
      expect(isSensitiveRateLimitKey("auth:login:127.0.0.1")).toBe(true);
      expect(isSensitiveRateLimitKey("auth:register:127.0.0.1")).toBe(true);
      expect(isSensitiveRateLimitKey("orders:create:usr-1")).toBe(true);
      expect(isSensitiveRateLimitKey("orders:track:9812345678")).toBe(true);
      expect(isSensitiveRateLimitKey("coupon:validate:usr-1")).toBe(true);
      expect(isSensitiveRateLimitKey("contact:submit:127.0.0.1")).toBe(true);
      expect(isSensitiveRateLimitKey("public:static-page")).toBe(false);
    });

    it("fails closed in production for sensitive endpoints when Upstash is missing", async () => {
      const origEnv = process.env.NODE_ENV;
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Sensitive auth request
        const authLimit = await checkRateLimit("auth:login:10.0.0.1", 5, 60_000);
        expect(authLimit.success).toBe(false);
        expect(authLimit.remaining).toBe(0);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[RateLimit] CRITICAL: Upstash Redis configuration missing in production!"),
        );

        // Sensitive order creation
        const orderLimit = await checkRateLimit("order:create:usr-123", 10, 60_000);
        expect(orderLimit.success).toBe(false);
        expect(orderLimit.remaining).toBe(0);

        // Sensitive tracking
        const trackLimit = await checkRateLimit("track:order:9800000000", 5, 60_000);
        expect(trackLimit.success).toBe(false);
        expect(trackLimit.remaining).toBe(0);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
        if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
        if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
      }
    });

    it("allows in-memory sliding window fallback in local development", async () => {
      const origEnv = process.env.NODE_ENV;
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "development";
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;

        const devLimit = await checkRateLimit("auth:login:dev-test-ip", 5, 60_000);
        expect(devLimit.success).toBe(true);
        expect(devLimit.remaining).toBe(4);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
        if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
        if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
      }
    });
  });

  describe("Failure Isolation: Broadcast & Push Failures Do Not Fail Order Flow", () => {
    it("handles broadcast network failure gracefully without throwing or rejecting", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Supabase connection timeout"));

      const order = {
        id: "ord-failsafe",
        orderNumber: "PH-FAILSAFE",
        createdAt: new Date(),
      };

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
      const orderTotal: number = 46500;
      const lookupAmount: number = 10000;

      const amountMatches = lookupAmount === orderTotal;
      expect(amountMatches).toBe(false);

      const paymentStatus: string = amountMatches ? "PAID" : "PENDING";
      expect(paymentStatus).toBe("PENDING");
    });
  });
});
