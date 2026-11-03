import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/realtime/broadcast", () => ({
  broadcastEvent: vi.fn().mockResolvedValue(true),
}));

type MockFn = ReturnType<typeof vi.fn>;
interface MockPrismaType {
  user: { findUnique: MockFn };
  order: { findUnique: MockFn };
  riderProfile: { findUnique: MockFn };
  delivery: { findFirst: MockFn; findUnique: MockFn; update: MockFn };
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    riderProfile: { findUnique: vi.fn() },
    delivery: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  return { mockPrisma: mp };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { locationStore } from "@/lib/location-store";
import { signCustomerTrackingToken } from "@/lib/supabase-realtime";
import { jwtVerify } from "jose";

describe("Phase 4: Live Location Pinging, Realtime Token & Security Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("locationStore: TTL, Minimization & Eviction", () => {
    it("stores lat/lng in memory/redis and retrieves with fresh status (isStale = false)", async () => {
      await locationStore.storeLocation("ord_test_1", {
        lat: 26.4856,
        lng: 87.2707,
      });

      const loc = await locationStore.getLocation("ord_test_1");
      expect(loc).not.toBeNull();
      expect(loc?.lat).toBe(26.4856);
      expect(loc?.lng).toBe(87.2707);
      expect(loc?.isStale).toBe(false);
    });

    it("immediately purges location on evictLocation", async () => {
      await locationStore.storeLocation("ord_test_evict", {
        lat: 26.5,
        lng: 87.3,
      });

      let loc = await locationStore.getLocation("ord_test_evict");
      expect(loc).not.toBeNull();

      await locationStore.evictLocation("ord_test_evict");
      loc = await locationStore.getLocation("ord_test_evict");
      expect(loc).toBeNull();
    });
  });

  describe("signCustomerTrackingToken: Scoped Channel & Role Defense", () => {
    it("mints a token scoped strictly to allowed_channels ['order-tracking-ORDER_ID'] with NO app_role", async () => {
      const origSecret = process.env.SUPABASE_JWT_SECRET;
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.SUPABASE_JWT_SECRET = "super_secret_jwt_key_at_least_32_chars_long!!";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test_anon_key";

      try {
        const signed = await signCustomerTrackingToken({
          orderId: "ord_cust_99",
          userId: "usr_cust_1",
        });

        expect(signed).not.toBeNull();
        expect(signed?.expiresInSeconds).toBe(600); // 10 minutes
        expect(signed?.channel).toBe("order-tracking-ord_cust_99");

        // Verify claims inside the JWT
        const { payload } = await jwtVerify(
          signed!.token,
          new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
        );

        // Security invariants:
        expect(payload.role).toBe("authenticated");
        expect(payload.allowed_channels).toEqual(["order-tracking-ord_cust_99"]);
        expect(payload.sub).toBe("usr_cust_1");
        expect(payload.app_role).toBeUndefined(); // Customer tracking tokens must NEVER have elevated app_role!
      } finally {
        process.env.SUPABASE_JWT_SECRET = origSecret;
        process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
      }
    });

    it("assigns a random guest UUID as subject when unauthenticated guest tracks order", async () => {
      const origSecret = process.env.SUPABASE_JWT_SECRET;
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.SUPABASE_JWT_SECRET = "super_secret_jwt_key_at_least_32_chars_long!!";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test_anon_key";

      try {
        const signed = await signCustomerTrackingToken({
          orderId: "ord_guest_10",
        });

        expect(signed).not.toBeNull();
        const { payload } = await jwtVerify(
          signed!.token,
          new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
        );

        expect(payload.sub).toMatch(/^guest-[a-f0-9-]+$/);
        expect(payload.allowed_channels).toEqual(["order-tracking-ord_guest_10"]);
      } finally {
        process.env.SUPABASE_JWT_SECRET = origSecret;
        process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
      }
    });
  });
});
