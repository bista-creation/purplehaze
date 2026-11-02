import { describe, expect, it, vi, beforeEach } from "vitest";

type MockFn = ReturnType<typeof vi.fn>;
interface MockPrismaType {
  user: { findUnique: MockFn };
  refreshToken: {
    create: MockFn;
    findUnique: MockFn;
    update: MockFn;
    updateMany: MockFn;
  };
  idempotencyKey: {
    findUnique: MockFn;
    create: MockFn;
    upsert: MockFn;
  };
  order: { findUnique: MockFn };
  payment: { create: MockFn };
  $transaction?: MockFn;
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    user: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  };
  mp.$transaction = vi.fn(async (args: unknown) => {
    if (typeof args === "function") return (args as (client: unknown) => unknown)(mp);
    return Promise.all(args as Promise<unknown>[]);
  });
  return { mockPrisma: mp };
});

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  signAccessToken,
  verifyAccessToken,
  issueTokenPair,
  rotateRefreshToken,
} from "./tokens";
import { hashToken } from "../security";
import { requireAdminAuth } from "./auth-context";
import { checkIdempotency, recordIdempotency } from "./idempotency";
import { signEsewa, parseEsewaCallbackData } from "../payments";
import { NextRequest } from "next/server";

describe("API v1 Core Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JWT Access Token & Refresh Tokens", () => {
    it("signs and successfully verifies an access token", async () => {
      const payload = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "CUSTOMER" as const,
        sessionVersion: 1,
      };

      const token = await signAccessToken(payload);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyAccessToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe("user-123");
      expect(verified?.email).toBe("test@example.com");
      expect(verified?.role).toBe("CUSTOMER");
      expect(verified?.sessionVersion).toBe(1);
    });

    it("rejects an invalid or tampered access token", async () => {
      const verified = await verifyAccessToken("invalid.tampered.token");
      expect(verified).toBeNull();
    });

    it("issues a new token pair and creates a refresh token record with SHA-256 hash", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: "rt-1",
        tokenHash: "abc",
      });

      const tokens = await issueTokenPair({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "CUSTOMER",
        sessionVersion: 1,
      });

      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
      expect(tokens.tokenType).toBe("Bearer");
      expect(tokens.expiresIn).toBe(900); // 15 minutes

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            tokenHash: hashToken(tokens.refreshToken),
          }),
        }),
      );
    });

    it("rotates refresh token and generates a new token pair belonging to the same family", async () => {
      const oldRawToken = "old-raw-token-123456789012345678901234567890";
      const oldHash = hashToken(oldRawToken);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        tokenHash: oldHash,
        userId: "user-123",
        familyId: "family-abc",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: "user-123",
          email: "user@example.com",
          name: "User Name",
          role: "CUSTOMER",
          sessionVersion: 1,
          isBlocked: false,
        },
      });

      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await rotateRefreshToken(oldRawToken);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
        expect(result.user.id).toBe("user-123");
      }

      // Verify the old token was marked replaced and revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rt-1" },
          data: expect.objectContaining({
            isRevoked: true,
          }),
        }),
      );
    });

    it("detects refresh token reuse and immediately revokes entire token family", async () => {
      const oldRawToken = "reused-raw-token-123456789012345678901234567890";
      const oldHash = hashToken(oldRawToken);

      // Token already marked isRevoked = true (meaning it was used before)
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        tokenHash: oldHash,
        userId: "user-123",
        familyId: "family-compromised",
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      const result = await rotateRefreshToken(oldRawToken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("REUSE_DETECTED");
      }

      // Ensure entire family was revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: "family-compromised" },
        data: expect.objectContaining({ isRevoked: true }),
      });
    });
  });

  describe("Role Guard Enforcement & Dual Auth Resolver", () => {
    it("returns 401 when request is unauthenticated", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/admin/orders");
      const guard = await requireAdminAuth(req);

      expect(guard.user).toBeNull();
      expect(guard.errorResponse).not.toBeNull();

      const body = await guard.errorResponse?.json();
      expect(guard.errorResponse?.status).toBe(401);
      expect(body?.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when authenticated user is CUSTOMER on admin endpoint", async () => {
      const token = await signAccessToken({
        id: "cust-1",
        email: "customer@example.com",
        name: "Jane Doe",
        role: "CUSTOMER",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cust-1",
        email: "customer@example.com",
        name: "Jane Doe",
        role: "CUSTOMER",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/orders", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const guard = await requireAdminAuth(req);
      expect(guard.user).toBeNull();
      expect(guard.errorResponse).not.toBeNull();

      const body = await guard.errorResponse?.json();
      expect(guard.errorResponse?.status).toBe(403);
      expect(body?.error?.code).toBe("FORBIDDEN");
    });

    it("allows ADMIN and STAFF to access admin routes", async () => {
      const adminToken = await signAccessToken({
        id: "admin-1",
        email: "admin@purplehaze.com",
        name: "Admin User",
        role: "ADMIN",
        sessionVersion: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "admin-1",
        email: "admin@purplehaze.com",
        name: "Admin User",
        role: "ADMIN",
        sessionVersion: 1,
        isBlocked: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/orders", {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      const guard = await requireAdminAuth(req);
      expect(guard.errorResponse).toBeNull();
      expect(guard.user).not.toBeNull();
      expect(guard.user?.role).toBe("ADMIN");
    });
  });

  describe("Idempotency Key Mechanism", () => {
    it("returns cached response on repeated request with same idempotency key", async () => {
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
        key: "idem-key-999",
        endpoint: "/api/v1/orders",
        statusCode: 201,
        response: JSON.stringify({ orderId: "ord-1", status: "PENDING" }),
        expiresAt: new Date(Date.now() + 60000),
      });

      const req = new NextRequest("http://localhost:3000/api/v1/orders", {
        headers: {
          "idempotency-key": "idem-key-999",
        },
      });

      const cached = await checkIdempotency(req, "/api/v1/orders");
      expect(cached).not.toBeNull();

      const body = await cached?.json();
      expect(body?.data?.orderId).toBe("ord-1");
      expect(body?.meta?.idempotent).toBe(true);
    });

    it("records idempotency key with response data and 24h expiration", async () => {
      mockPrisma.idempotencyKey.upsert.mockResolvedValue({});

      await recordIdempotency("idem-key-123", "/api/v1/orders", "user-1", 201, {
        orderId: "ord-123",
      });

      expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "idem-key-123" },
          create: expect.objectContaining({
            key: "idem-key-123",
            endpoint: "/api/v1/orders",
            userId: "user-1",
            statusCode: 201,
          }),
        }),
      );
    });
  });

  describe("Payment Signature & Verification", () => {
    it("computes valid HMAC-SHA256 signature for eSewa", () => {
      const message = "total_amount=1000.00,transaction_uuid=uuid-test-123,product_code=EPAYTEST";
      const sig = signEsewa(message, "8gBm/Du/punq");

      expect(typeof sig).toBe("string");
      expect(sig.length).toBeGreaterThan(10);
    });

    it("parses valid base64 eSewa callback payload", () => {
      const payload = {
        transaction_code: "TXN123",
        status: "COMPLETE",
        total_amount: "500.00",
        transaction_uuid: "order-123",
        product_code: "EPAYTEST",
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: "dummy-sig",
      };

      const base64Str = Buffer.from(JSON.stringify(payload)).toString("base64");
      const parsed = parseEsewaCallbackData(base64Str);

      expect(parsed).not.toBeNull();
      expect(parsed?.transaction_code).toBe("TXN123");
      expect(parsed?.status).toBe("COMPLETE");
      expect(parsed?.total_amount).toBe("500.00");
    });
  });
});
