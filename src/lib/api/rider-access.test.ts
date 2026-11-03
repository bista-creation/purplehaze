/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

type MockFn = ReturnType<typeof vi.fn>;
interface MockPrismaType {
  user: { findUnique: MockFn };
  order: { findFirst: MockFn };
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    user: { findUnique: vi.fn() },
    order: { findFirst: vi.fn() },
  };
  return { mockPrisma: mp };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/security", () => ({
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}));

vi.mock("@/lib/services/order.service", () => ({
  orderService: {
    trackOrder: vi.fn(),
    getOrderById: vi.fn(),
    getOrderByNumber: vi.fn(),
  },
}));

import { requireRiderAuth, requireAdminAuth } from "./auth-context";
import { signAccessToken } from "./tokens";
import { GET as trackOrderGet, POST as trackOrderPost } from "@/app/api/v1/orders/track/route";
import { GET as getOrderByIdRoute } from "@/app/api/v1/orders/[id]/route";
import { orderService } from "@/lib/services/order.service";

describe("Rider Role Boundaries & Customer OTP Leak Resistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireRiderAuth Boundary Enforcement", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/rider/orders");
      const { user, errorResponse } = await requireRiderAuth(req);

      expect(user).toBeNull();
      expect(errorResponse).toBeDefined();
      const body = await errorResponse?.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(errorResponse?.status).toBe(401);
    });

    it("rejects CUSTOMER role with 403 Forbidden", async () => {
      const token = await signAccessToken({
        id: "usr_cust_1",
        email: "customer@example.com",
        name: "Customer",
        role: "CUSTOMER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_cust_1",
        email: "customer@example.com",
        name: "Customer",
        role: "CUSTOMER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/rider/orders", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireRiderAuth(req);

      expect(user).toBeNull();
      expect(errorResponse?.status).toBe(403);
      const body = await errorResponse?.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("rejects ADMIN role from rider endpoints with 403 Forbidden", async () => {
      const token = await signAccessToken({
        id: "usr_admin_1",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_admin_1",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/rider/orders", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireRiderAuth(req);

      expect(user).toBeNull();
      expect(errorResponse?.status).toBe(403);
    });

    it("authorizes RIDER role successfully", async () => {
      const token = await signAccessToken({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider Santosh",
        role: "RIDER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider Santosh",
        role: "RIDER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/rider/orders", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireRiderAuth(req);

      expect(errorResponse).toBeNull();
      expect(user?.id).toBe("usr_rider_1");
      expect(user?.role).toBe("RIDER");
    });

    it("strictly blocks RIDER accounts from accessing admin endpoints", async () => {
      const token = await signAccessToken({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/riders", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireAdminAuth(req);

      expect(user).toBeNull();
      expect(errorResponse?.status).toBe(403);
      const body = await errorResponse?.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("OTP Leak Resistance at Customer Tracking Endpoints", () => {
    it("blocks RIDER role completely from GET /orders/track", async () => {
      const token = await signAccessToken({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/v1/orders/track?orderNumber=PH-1001&phone=9800000000",
        { headers: { authorization: `Bearer ${token}` } }
      );
      const res = await trackOrderGet(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("Riders cannot access customer tracking endpoints");
    });

    it("blocks RIDER role completely from POST /orders/track", async () => {
      const token = await signAccessToken({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/orders/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderNumber: "PH-1001", phone: "9800000000" }),
      });
      const res = await trackOrderPost(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("ensures guest tracking via orderNumber + phone NEVER exposes deliveryOtp or publicToken", async () => {
      vi.mocked(orderService.trackOrder).mockResolvedValue({
        id: "ord_1001",
        orderNumber: "PH-1001",
        publicToken: "super-secret-unguessable-public-token-xyz",
        customerPhone: "9800000000",
        customerName: "Hari Bahadur",
        status: "OUT_FOR_DELIVERY",
        paymentStatus: "PAID",
        type: "DELIVERY",
        createdAt: new Date(),
        subtotal: 1500,
        deliveryFee: 100,
        discountAmount: 0,
        total: 1600,
        items: [],
        statusHistory: [],
      } as any);

      const req = new NextRequest(
        "http://localhost:3000/api/v1/orders/track?orderNumber=PH-1001&phone=9800000000"
      );
      const res = await trackOrderGet(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify zero leak of publicToken or deliveryOtp
      expect(body.data.orderNumber).toBe("PH-1001");
      expect(body.data.publicToken).toBeUndefined();
      expect(body.data.deliveryOtp).toBeUndefined();
      expect(body.data.customerPhone).toBeUndefined();
      expect(body.data.customerEmail).toBeUndefined();
    });

    it("blocks RIDER role from GET /orders/[id]", async () => {
      const token = await signAccessToken({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_rider_1",
        email: "rider@example.com",
        name: "Rider",
        role: "RIDER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/orders/ord_1001", {
        headers: { authorization: `Bearer ${token}` },
      });
      const res = await getOrderByIdRoute(req, {
        params: Promise.resolve({ id: "ord_1001" }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });
});
