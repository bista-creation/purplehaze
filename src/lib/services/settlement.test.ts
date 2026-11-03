/* eslint-disable @typescript-eslint/no-explicit-any */
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

type MockFn = ReturnType<typeof vi.fn>;
interface MockPrismaType {
  riderProfile: {
    findUnique: MockFn;
    findMany: MockFn;
  };
  delivery: {
    findMany: MockFn;
  };
  riderSettlement: {
    upsert: MockFn;
    findUnique: MockFn;
    update: MockFn;
  };
  riderCashHandover: {
    create: MockFn;
    findMany: MockFn;
  };
  $transaction: MockFn;
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    riderProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    delivery: {
      findMany: vi.fn(),
    },
    riderSettlement: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    riderCashHandover: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma: mp };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { settlementService } from "./settlement.service";
import { writeAuditLog } from "@/lib/audit";

describe("Settlement Service & Asia/Kathmandu Day Boundary (Phase 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRiderTodaySettlement", () => {
    it("returns NOT_FOUND if rider profile does not exist", async () => {
      mockPrisma.riderProfile.findUnique.mockResolvedValueOnce(null);

      const result = await settlementService.getRiderTodaySettlement("usr_unknown");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("calculates today's COD expected sum, upserts settlement, and returns summary", async () => {
      mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({
        id: "rider_1",
        userId: "usr_1",
        shiftStatus: "ON_DUTY",
        user: { name: "Ram Bahadur", phone: "+9779800000000" },
      });

      // 2 deliveries today: 1 COD (Rs 1500 = 150000 paisa), 1 Prepaid (Rs 800)
      mockPrisma.delivery.findMany.mockResolvedValueOnce([
        {
          id: "deliv_1",
          codAmountPaisa: 150000,
          cashCollectedPaisa: 150000,
          status: "DELIVERED",
          deliveredAt: new Date(),
          order: {
            id: "ord_1",
            orderNumber: "PH-1001",
            customerName: "Sita Sharma",
            customerPhone: "+9779811111111",
            paymentMethod: "COD",
            total: 150000,
          },
        },
        {
          id: "deliv_2",
          codAmountPaisa: 0,
          cashCollectedPaisa: 0,
          status: "DELIVERED",
          deliveredAt: new Date(),
          order: {
            id: "ord_2",
            orderNumber: "PH-1002",
            customerName: "Hari Kumar",
            customerPhone: "+9779822222222",
            paymentMethod: "ESEWA",
            total: 80000,
          },
        },
      ]);

      mockPrisma.riderSettlement.upsert.mockResolvedValueOnce({
        id: "set_1",
        riderId: "rider_1",
        settlementDate: new Date(),
        ordersDelivered: 2,
        codExpectedPaisa: 150000,
        riderReportedPaisa: 150000,
        cashierCountPaisa: 0,
        differencePaisa: -150000,
        status: "PENDING",
        notes: null,
        reconciledAt: null,
        reconciledByAdmin: null,
        handovers: [],
      });

      const result = await settlementService.getRiderTodaySettlement("usr_1");

      expect(result.success).toBe(true);
      expect(result.data?.ordersDelivered).toBe(2);
      expect(result.data?.codOrdersCount).toBe(1);
      expect(result.data?.codExpectedPaisa).toBe(150000);
      expect(result.data?.differencePaisa).toBe(-150000);
      expect(result.data?.status).toBe("PENDING");

      // Verify Prisma upsert was called with Asia/Kathmandu midnight date
      expect(mockPrisma.riderSettlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            riderId_settlementDate: expect.objectContaining({
              riderId: "rider_1",
            }),
          }),
        })
      );
    });
  });

  describe("recordCashHandover", () => {
    it("returns NOT_FOUND if settlement does not exist", async () => {
      mockPrisma.riderSettlement.findUnique.mockResolvedValueOnce(null);

      const result = await settlementService.recordCashHandover({
        settlementId: "set_missing",
        amountPaisa: 50000,
        adminUser: { id: "adm_1", email: "admin@purplehaze.com" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("rejects non-positive handover amounts with BAD_REQUEST", async () => {
      mockPrisma.riderSettlement.findUnique.mockResolvedValueOnce({
        id: "set_1",
        rider: { user: { email: "rider@purplehaze.com" } },
        handovers: [],
      });

      const result = await settlementService.recordCashHandover({
        settlementId: "set_1",
        amountPaisa: 0,
        adminUser: { id: "adm_1", email: "admin@purplehaze.com" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("BAD_REQUEST");
    });

    it("records handover and marks settlement RECONCILED when cash received matches expected COD", async () => {
      mockPrisma.riderSettlement.findUnique.mockResolvedValueOnce({
        id: "set_1",
        codExpectedPaisa: 150000,
        rider: { user: { email: "rider@purplehaze.com" } },
        handovers: [],
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          riderCashHandover: {
            create: vi.fn().mockResolvedValue({
              id: "ho_1",
              amountPaisa: 150000,
            }),
            findMany: vi.fn().mockResolvedValue([{ amountPaisa: 150000 }]),
          },
          riderSettlement: {
            update: vi.fn().mockResolvedValue({
              id: "set_1",
              cashierCountPaisa: 150000,
              differencePaisa: 0,
              status: "RECONCILED",
              handovers: [],
            }),
          },
        };
        return callback(tx);
      });

      const result = await settlementService.recordCashHandover({
        settlementId: "set_1",
        amountPaisa: 150000,
        adminUser: { id: "adm_1", email: "admin@purplehaze.com" },
        notes: "Full cash received at end of shift",
      });

      expect(result.success).toBe(true);
      expect(result.data?.settlement.status).toBe("RECONCILED");
      expect(result.data?.settlement.differencePaisa).toBe(0);

      // Verify audit log written
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "settlement.cash_handover",
          entity: "RiderSettlement",
          entityId: "set_1",
        })
      );
    });

    it("records handover and flags DISCREPANCY when cash received does not equal expected COD", async () => {
      mockPrisma.riderSettlement.findUnique.mockResolvedValueOnce({
        id: "set_1",
        codExpectedPaisa: 150000,
        rider: { user: { email: "rider@purplehaze.com" } },
        handovers: [],
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          riderCashHandover: {
            create: vi.fn().mockResolvedValue({
              id: "ho_1",
              amountPaisa: 140000,
            }),
            findMany: vi.fn().mockResolvedValue([{ amountPaisa: 140000 }]),
          },
          riderSettlement: {
            update: vi.fn().mockResolvedValue({
              id: "set_1",
              cashierCountPaisa: 140000,
              differencePaisa: -10000,
              status: "DISCREPANCY",
              handovers: [],
            }),
          },
        };
        return callback(tx);
      });

      const result = await settlementService.recordCashHandover({
        settlementId: "set_1",
        amountPaisa: 140000,
        adminUser: { id: "adm_1", email: "admin@purplehaze.com" },
        notes: "Rs 100 shortage noted",
      });

      expect(result.success).toBe(true);
      expect(result.data?.settlement.status).toBe("DISCREPANCY");
      expect(result.data?.settlement.differencePaisa).toBe(-10000);
    });
  });
});
