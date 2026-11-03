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

vi.mock("@/lib/qstash", () => ({
  scheduleAssignmentTimeout: vi.fn().mockResolvedValue({ success: true, messageId: "msg_123" }),
  getQStashClient: vi.fn().mockReturnValue(null),
  getQStashReceiver: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/realtime/broadcast", () => ({
  broadcastEvent: vi.fn().mockResolvedValue(true),
}));

type MockFn = ReturnType<typeof vi.fn>;
interface MockPrismaType {
  order: {
    findUnique: MockFn;
    update: MockFn;
    updateMany: MockFn;
    findMany: MockFn;
  };
  riderProfile: {
    findUnique: MockFn;
    findMany: MockFn;
  };
  delivery: {
    findUnique: MockFn;
    upsert: MockFn;
    update: MockFn;
    findMany: MockFn;
  };
  deliveryAttempt: {
    create: MockFn;
  };
  orderStatusHistory: {
    create: MockFn;
  };
  $transaction: MockFn;
}

const { mockPrisma } = vi.hoisted(() => {
  const mp: MockPrismaType = {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    riderProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    delivery: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    deliveryAttempt: {
      create: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  };
  return { mockPrisma: mp };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { deliveryService } from "./delivery.service";
import { orderService } from "./order.service";
import { generateDeliveryOtp } from "@/lib/security/otp";
import { scheduleAssignmentTimeout } from "@/lib/qstash";
import { writeAuditLog } from "@/lib/audit";

describe("Phase 2: Delivery Dispatch, State Machine & OTP Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dispatch Order Guards & Idempotency", () => {
    it("rejects dispatching non-delivery orders (PICKUP / DINE_IN)", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_pickup_1",
        type: "PICKUP",
        status: "CONFIRMED",
      });

      const res = await deliveryService.dispatchOrder("ord_pickup_1", "rider_1", {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("INVALID_ORDER_TYPE");
    });

    it("rejects dispatching orders that are still PENDING", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        type: "DELIVERY",
        status: "PENDING",
      });

      const res = await deliveryService.dispatchOrder("ord_1", "rider_1", {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("INVALID_ORDER_STATUS");
    });

    it("rejects dispatching to an OFF_DUTY or unverified rider", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        type: "DELIVERY",
        status: "READY",
        deliveryFee: 100,
        total: 1200,
        paymentMethod: "COD",
      });

      mockPrisma.riderProfile.findUnique.mockResolvedValue({
        id: "rider_1",
        shiftStatus: "OFF_DUTY",
        licenseStatus: "VERIFIED",
        user: { isBlocked: false },
      });

      const res = await deliveryService.dispatchOrder("ord_1", "rider_1", {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("RIDER_OFF_DUTY");
    });

    it("successfully dispatches order, generates assignmentAttemptId, and schedules QStash timeout", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        orderNumber: "PH-9901",
        type: "DELIVERY",
        status: "READY",
        deliveryFee: 100,
        total: 1200,
        paymentMethod: "COD",
      });

      mockPrisma.riderProfile.findUnique.mockResolvedValue({
        id: "rider_1",
        shiftStatus: "ON_DUTY",
        licenseStatus: "VERIFIED",
        licenseExpiresAt: new Date(Date.now() + 100000000),
        user: { name: "Santosh", email: "santosh@rider.com", isBlocked: false },
      });

      mockPrisma.delivery.upsert.mockResolvedValue({
        id: "deliv_1",
        orderId: "ord_1",
        status: "ASSIGNED",
        riderId: "rider_1",
        assignmentAttemptId: "att_12345",
      });

      const res = await deliveryService.dispatchOrder("ord_1", "rider_1", {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.delivery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: "ord_1" },
          create: expect.objectContaining({
            status: "ASSIGNED",
            provider: "OWN_RIDER",
          }),
        })
      );

      expect(scheduleAssignmentTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: "deliv_1",
          delaySeconds: 120,
        })
      );

      expect(mockPrisma.deliveryAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveryId: "deliv_1",
            action: "ASSIGNED",
          }),
        })
      );

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delivery.dispatch",
        })
      );
    });
  });

  describe("Rider Accept / Decline Actions", () => {
    it("allows assigned rider to accept within timeout window", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ASSIGNED",
        orderId: "ord_1",
        riderId: "rider_1",
        rider: { userId: "usr_rider_1" },
        order: { orderNumber: "PH-9901", status: "READY" },
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "ACCEPTED",
      });

      const res = await deliveryService.acceptDelivery("deliv_1", "usr_rider_1");
      expect(res.success).toBe(true);
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deliv_1" },
          data: expect.objectContaining({ status: "ACCEPTED" }),
        })
      );
    });

    it("rejects accept attempt by a different rider", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ASSIGNED",
        rider: { userId: "usr_rider_1" },
      });

      const res = await deliveryService.acceptDelivery("deliv_1", "usr_rider_OTHER");
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("FORBIDDEN");
    });

    it("allows assigned rider to decline, releasing riderId for re-dispatch", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ASSIGNED",
        orderId: "ord_1",
        riderId: "rider_1",
        rider: { userId: "usr_rider_1" },
        order: { orderNumber: "PH-9901", status: "READY" },
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "DECLINED",
        riderId: null,
      });

      const res = await deliveryService.declineDelivery("deliv_1", "usr_rider_1", "Flat tire");
      expect(res.success).toBe(true);
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deliv_1" },
          data: expect.objectContaining({
            status: "DECLINED",
            riderId: null,
          }),
        })
      );
      expect(mockPrisma.deliveryAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DECLINED",
            reason: "Flat tire",
          }),
        })
      );
    });
  });

  describe("Kitchen Guard on Pickup", () => {
    it("blocks pickup if kitchen order status is NOT READY", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ACCEPTED",
        rider: { userId: "usr_rider_1" },
        order: { status: "PREPARING" }, // Kitchen still cooking!
      });

      const res = await deliveryService.pickupDelivery("deliv_1", "usr_rider_1");
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("ORDER_NOT_READY");
      expect(res.error?.message).toContain("Food is still being prepared");
    });

    it("allows pickup when kitchen status is READY and advances order to OUT_FOR_DELIVERY", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ACCEPTED",
        orderId: "ord_1",
        riderId: "rider_1",
        rider: { userId: "usr_rider_1" },
        order: { id: "ord_1", status: "READY", orderNumber: "PH-9901" },
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "PICKED_UP",
      });

      const res = await deliveryService.pickupDelivery("deliv_1", "usr_rider_1");
      expect(res.success).toBe(true);

      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PICKED_UP" }),
        })
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord_1" },
          data: expect.objectContaining({ status: "OUT_FOR_DELIVERY" }),
        })
      );
    });
  });

  describe("Delivery OTP Verification & Lockout", () => {
    it("locks OTP after 3 failed attempts", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ARRIVED_AT_CUSTOMER",
        rider: { userId: "usr_rider_1" },
        order: { orderNumber: "PH-9901" },
        otpVersion: 1,
        otpAttempts: 2, // 2 previous failed attempts
        otpLocked: false,
      });

      const res = await deliveryService.completeDeliveryWithOtp("deliv_1", "usr_rider_1", "000000"); // Wrong OTP
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("OTP_LOCKED");
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            otpAttempts: 3,
            otpLocked: true,
          }),
        })
      );
    });

    it("verifies valid OTP, completes delivery, and marks COD paid", async () => {
      const validOtp = generateDeliveryOtp("deliv_1", 1);

      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ARRIVED_AT_CUSTOMER",
        orderId: "ord_1",
        riderId: "rider_1",
        codAmountPaisa: 150000,
        rider: { userId: "usr_rider_1", user: { email: "rider@test.com" } },
        order: { id: "ord_1", orderNumber: "PH-9901", paymentMethod: "COD" },
        otpVersion: 1,
        otpAttempts: 0,
        otpLocked: false,
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "DELIVERED",
      });

      const res = await deliveryService.completeDeliveryWithOtp("deliv_1", "usr_rider_1", validOtp, 150000);
      expect(res.success).toBe(true);

      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "DELIVERED",
            cashCollectedPaisa: 150000,
          }),
        })
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord_1" },
          data: expect.objectContaining({
            status: "COMPLETED",
            paymentStatus: "PAID",
          }),
        })
      );

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delivery.complete",
          entityId: "deliv_1",
        })
      );
    });
  });

  describe("QStash 120s Assignment Timeout Handler", () => {
    it("transitions delivery to TIMEOUT and unassigns rider if still in ASSIGNED", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ASSIGNED",
        assignmentAttemptId: "attempt_abc",
        riderId: "rider_1",
        order: { orderNumber: "PH-9901", status: "READY" },
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "TIMEOUT",
      });

      const res = await deliveryService.handleAssignmentTimeout("deliv_1", "attempt_abc");
      expect(res.success).toBe(true);
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deliv_1" },
          data: expect.objectContaining({
            status: "TIMEOUT",
            riderId: null,
          }),
        })
      );
      expect(mockPrisma.deliveryAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "TIMEOUT" }),
        })
      );
    });

    it("is strictly idempotent: does nothing if delivery was already accepted", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ACCEPTED", // Already accepted by rider!
        assignmentAttemptId: "attempt_abc",
      });

      const res = await deliveryService.handleAssignmentTimeout("deliv_1", "attempt_abc");
      expect(res.success).toBe(true);
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
    });
  });

  describe("Admin Emergency Override & Order Status Integrity", () => {
    it("requires written reason for admin override and logs audit event", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: "deliv_1",
        status: "ASSIGNED",
        orderId: "ord_1",
        order: { orderNumber: "PH-9901" },
      });

      mockPrisma.delivery.update.mockResolvedValue({
        id: "deliv_1",
        status: "DELIVERED",
      });

      const res = await deliveryService.adminOverride(
        "deliv_1",
        "DELIVERED",
        "Customer confirmed delivery over phone; rider device malfunctioned",
        { id: "admin_1", email: "admin@purplehaze.com" }
      );

      expect(res.success).toBe(true);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delivery.admin_override",
          actorEmail: "admin@purplehaze.com",
        })
      );
    });

    it("blocks manual Order.status change to OUT_FOR_DELIVERY for own-rider orders", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        type: "DELIVERY",
        status: "READY",
        deliveryProvider: "OWN_RIDER",
        delivery: { id: "deliv_1", status: "ASSIGNED" },
        items: [],
      });

      const res = await orderService.updateOrderStatus("ord_1", "OUT_FOR_DELIVERY", "admin@test.com");
      expect(res.success).toBe(false);
      expect(res.message).toContain("automatically move to 'On the way'");
    });

    it("blocks manual Order.status change to COMPLETED for own-rider orders", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord_1",
        type: "DELIVERY",
        status: "OUT_FOR_DELIVERY",
        deliveryProvider: "OWN_RIDER",
        delivery: { id: "deliv_1", status: "ARRIVED_AT_CUSTOMER" },
        items: [],
      });

      const res = await orderService.updateOrderStatus("ord_1", "COMPLETED", "admin@test.com");
      expect(res.success).toBe(false);
      expect(res.message).toContain("completed via rider OTP verification");
    });
  });
});
