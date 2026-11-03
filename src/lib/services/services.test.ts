import { describe, expect, it } from "vitest";
import { calculateOrderTotals, calculateCouponDiscount } from "@/lib/money";
import { ORDER_STATUS_FLOW, CUSTOMER_CANCELLABLE } from "@/lib/constants";
import { evaluateOrderAcceptance } from "@/lib/order-state";

describe("Shared Service Layer - Business Logic & Flow Enforcement", () => {
  describe("Order Status State Machine Transitions", () => {
    it("allows valid forward transitions from PENDING", () => {
      const allowed = ORDER_STATUS_FLOW.PENDING;
      expect(allowed).toContain("CONFIRMED");
      expect(allowed).toContain("CANCELLED");
      expect(allowed).not.toContain("COMPLETED");
      expect(allowed).not.toContain("READY");
    });

    it("allows valid transitions from CONFIRMED to PREPARING", () => {
      const allowed = ORDER_STATUS_FLOW.CONFIRMED;
      expect(allowed).toContain("PREPARING");
      expect(allowed).toContain("CANCELLED");
      expect(allowed).not.toContain("COMPLETED");
    });

    it("allows valid transitions from PREPARING to READY", () => {
      const allowed = ORDER_STATUS_FLOW.PREPARING;
      expect(allowed).toContain("READY");
      expect(allowed).toContain("CANCELLED");
      expect(allowed).not.toContain("PENDING");
    });

    it("allows transitions from READY to OUT_FOR_DELIVERY or COMPLETED", () => {
      const allowed = ORDER_STATUS_FLOW.READY;
      expect(allowed).toContain("OUT_FOR_DELIVERY");
      expect(allowed).toContain("COMPLETED");
      expect(allowed).toContain("CANCELLED");
    });

    it("allows transition from OUT_FOR_DELIVERY only to COMPLETED", () => {
      const allowed = ORDER_STATUS_FLOW.OUT_FOR_DELIVERY;
      expect(allowed).toEqual(["COMPLETED"]);
      expect(allowed).not.toContain("CANCELLED");
    });

    it("does not allow any transitions from terminal states", () => {
      expect(ORDER_STATUS_FLOW.COMPLETED).toEqual([]);
      expect(ORDER_STATUS_FLOW.CANCELLED).toEqual([]);
    });

    it("strictly restricts customer cancellations to PENDING and CONFIRMED", () => {
      expect(CUSTOMER_CANCELLABLE).toContain("PENDING");
      expect(CUSTOMER_CANCELLABLE).toContain("CONFIRMED");
      expect(CUSTOMER_CANCELLABLE).not.toContain("PREPARING");
      expect(CUSTOMER_CANCELLABLE).not.toContain("READY");
      expect(CUSTOMER_CANCELLABLE).not.toContain("OUT_FOR_DELIVERY");
      expect(CUSTOMER_CANCELLABLE).not.toContain("COMPLETED");
    });
  });

  describe("Order Acceptance Policy", () => {
    it("blocks online orders with UNPAID or INITIATED status", () => {
      const esewaUnpaid = evaluateOrderAcceptance({
        status: "PENDING",
        type: "DELIVERY",
        paymentMethod: "ESEWA",
        paymentStatus: "INITIATED",
      });
      expect(esewaUnpaid.allowed).toBe(false);

      const khaltiUnpaid = evaluateOrderAcceptance({
        status: "PENDING",
        type: "DELIVERY",
        paymentMethod: "KHALTI",
        paymentStatus: "UNPAID",
      });
      expect(khaltiUnpaid.allowed).toBe(false);
    });

    it("allows online orders when paymentStatus is PAID", () => {
      const esewaPaid = evaluateOrderAcceptance({
        status: "PENDING",
        type: "DELIVERY",
        paymentMethod: "ESEWA",
        paymentStatus: "PAID",
      });
      expect(esewaPaid.allowed).toBe(true);
      if (esewaPaid.allowed) {
        expect(esewaPaid.payment.isPaid).toBe(true);
      }
    });

    it("allows COD orders to be accepted while unpaid (Cash Due)", () => {
      const codOrder = evaluateOrderAcceptance({
        status: "PENDING",
        type: "DELIVERY",
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
      });
      expect(codOrder.allowed).toBe(true);
      if (codOrder.allowed) {
        expect(codOrder.payment.isCashDue).toBe(true);
      }
    });

    it("rejects non-pending orders from acceptance", () => {
      const confirmedOrder = evaluateOrderAcceptance({
        status: "CONFIRMED",
        type: "DELIVERY",
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
      });
      expect(confirmedOrder.allowed).toBe(false);
    });
  });

  describe("Coupon Calculation Service Rules", () => {
    it("applies percent discounts within bounds", () => {
      const coupon = {
        type: "PERCENT",
        value: 10,
        minOrder: 50000, // Rs 500
        maxDiscount: 10000, // Rs 100 max
        isActive: true,
      };
      // subtotal Rs 1000 -> 10% is Rs 100 (10000 paisa)
      const res = calculateCouponDiscount(coupon, 100000);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.discount).toBe(10000);
      }
    });

    it("caps percent discount at maxDiscount", () => {
      const coupon = {
        type: "PERCENT",
        value: 20,
        minOrder: 50000,
        maxDiscount: 10000, // max Rs 100
        isActive: true,
      };
      // subtotal Rs 2000 -> 20% would be Rs 400, but capped at Rs 100
      const res = calculateCouponDiscount(coupon, 200000);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.discount).toBe(10000);
      }
    });

    it("rejects coupons when subtotal is below minOrder", () => {
      const coupon = {
        type: "FIXED",
        value: 10000,
        minOrder: 100000, // Rs 1000 min
        maxDiscount: null,
        isActive: true,
      };
      const res = calculateCouponDiscount(coupon, 50000); // Rs 500 subtotal
      expect(res.valid).toBe(false);
    });

    it("rejects inactive or expired coupons", () => {
      const inactive = {
        type: "PERCENT",
        value: 10,
        minOrder: 0,
        maxDiscount: null,
        isActive: false,
      };
      expect(calculateCouponDiscount(inactive, 50000).valid).toBe(false);

      const expired = {
        type: "PERCENT",
        value: 10,
        minOrder: 0,
        maxDiscount: null,
        isActive: true,
        expiresAt: new Date(Date.now() - 10000),
      };
      expect(calculateCouponDiscount(expired, 50000).valid).toBe(false);
    });
  });

  describe("Cart & Order Server-side Pricing", () => {
    it("never trusts client prices and computes subtotal, tax and totals purely from paisa", () => {
      const totals = calculateOrderTotals({
        subtotal: 100000, // Rs 1000
        deliveryFee: 15000, // Rs 150
        discountAmount: 10000, // Rs 100 discount -> net 90000
        taxRate: 13, // 13% of 90000 = 11700
      });

      expect(totals.subtotal).toBe(100000);
      expect(totals.discountAmount).toBe(10000);
      expect(totals.taxAmount).toBe(11700);
      expect(totals.deliveryFee).toBe(15000);
      // Total = (100000 - 10000) + 11700 + 15000 = 116700 paisa (Rs 1,167)
      expect(totals.total).toBe(116700);
    });
  });
});
