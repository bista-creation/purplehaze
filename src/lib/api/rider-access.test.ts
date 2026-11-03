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
  riderProfile: { findUnique: MockFn };
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    user: { findUnique: vi.fn() },
    order: { findFirst: vi.fn() },
    riderProfile: { findUnique: vi.fn() },
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

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/order.service", () => ({
  orderService: {
    trackOrder: vi.fn(),
    getOrderById: vi.fn(),
    getOrderByNumber: vi.fn(),
  },
}));

import { requireRiderAuth, requireAdminAuth, requireAdminOnlyAuth } from "./auth-context";
import { signAccessToken } from "./tokens";
import { GET as trackOrderGet, POST as trackOrderPost } from "@/app/api/v1/orders/track/route";
import { GET as getOrderByIdRoute } from "@/app/api/v1/orders/[id]/route";
import { GET as getRiderAdminDetailsRoute } from "@/app/api/v1/admin/riders/[id]/route";
import { orderService } from "@/lib/services/order.service";
import { encryptPii } from "../security/encryption";
import { writeAuditLog } from "@/lib/audit";

describe("Rider Role Boundaries, Document Permissions & OTP Leak Resistance", () => {
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

    it("refuses regular rider endpoints with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
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

      mockPrisma.riderProfile.findUnique.mockResolvedValue({
        mustChangePassword: true,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/rider/orders", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireRiderAuth(req);

      expect(user).toBeNull();
      expect(errorResponse?.status).toBe(403);
      const body = await errorResponse?.json();
      expect(body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
      expect(body.error.message).toContain("must change your temporary password");
    });

    it("allows first-login change password endpoint even when mustChangePassword is true", async () => {
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

      const req = new NextRequest("http://localhost:3000/api/v1/rider/auth/first-login", {
        headers: { authorization: `Bearer ${token}` },
      });
      const { user, errorResponse } = await requireRiderAuth(req, { allowMustChangePassword: true });

      expect(errorResponse).toBeNull();
      expect(user?.id).toBe("usr_rider_1");
    });

    it("authorizes RIDER role successfully once password is changed", async () => {
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

      mockPrisma.riderProfile.findUnique.mockResolvedValue({
        mustChangePassword: false,
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

  describe("Decrypted Document View Access Control & Audit Logging", () => {
    it("refuses STAFF role from viewing decrypted rider documents with 403 Forbidden", async () => {
      const token = await signAccessToken({
        id: "usr_staff_1",
        email: "staff@purplehaze.com",
        name: "Staff Member",
        role: "STAFF",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_staff_1",
        email: "staff@purplehaze.com",
        name: "Staff Member",
        role: "STAFF",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/riders/prof_1", {
        headers: { authorization: `Bearer ${token}` },
      });
      const res = await getRiderAdminDetailsRoute(req, {
        params: Promise.resolve({ id: "prof_1" }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("Administrator privileges required");
    });

    it("allows ADMIN role to view decrypted documents and records an audit log entry", async () => {
      const token = await signAccessToken({
        id: "usr_admin_1",
        email: "admin@purplehaze.com",
        name: "Admin User",
        role: "ADMIN",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "usr_admin_1",
        email: "admin@purplehaze.com",
        name: "Admin User",
        role: "ADMIN",
        sessionVersion: 1,
        isBlocked: false,
      });

      const encryptedPlate = encryptPii("Ko 2 Pa 1234");
      const encryptedLicense = encryptPii("01-06-998877");

      mockPrisma.riderProfile.findUnique.mockResolvedValue({
        id: "prof_1",
        userId: "usr_rider_1",
        vehicleType: "MOTORCYCLE",
        encryptedPlateNumber: encryptedPlate,
        encryptedLicenseNo: encryptedLicense,
        licenseStatus: "VERIFIED",
        licenseVerifiedAt: new Date(),
        licenseExpiresAt: null,
        shiftStatus: "OFF_DUTY",
        mustChangePassword: false,
        lastActiveAt: null,
        user: {
          id: "usr_rider_1",
          name: "Rider Test",
          email: "rider@purplehaze.com",
          phone: "9800000000",
          isBlocked: false,
          createdAt: new Date(),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/riders/prof_1", {
        headers: { authorization: `Bearer ${token}` },
      });
      const res = await getRiderAdminDetailsRoute(req, {
        params: Promise.resolve({ id: "prof_1" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.plateNumber).toBe("Ko 2 Pa 1234");
      expect(body.data.licenseNumber).toBe("01-06-998877");

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rider.pii.decrypt",
          actorEmail: "admin@purplehaze.com",
          entityId: "prof_1",
        })
      );
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
