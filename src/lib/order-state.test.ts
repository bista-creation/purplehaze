import { describe, expect, it } from "vitest";
import {
  evaluateOrderAcceptance,
  orderServiceSummary,
  paymentPresentation,
} from "./order-state";

const pending = {
  status: "PENDING",
  type: "DELIVERY",
  paymentMethod: "COD",
  paymentStatus: "UNPAID",
};

describe("evaluateOrderAcceptance", () => {
  it("allows COD while cash is still due", () => {
    const result = evaluateOrderAcceptance(pending);
    expect(result.allowed).toBe(true);
    expect(result.payment.isCashDue).toBe(true);
    expect(result.payment.label).toBe("Cash due");
  });

  it("blocks an online order until the provider verifies payment", () => {
    const result = evaluateOrderAcceptance({
      ...pending,
      paymentMethod: "ESEWA",
      paymentStatus: "INITIATED",
    });
    expect(result).toMatchObject({
      allowed: false,
      reason: expect.stringMatching(/not verified/i),
    });
  });

  it("allows a verified-paid online order", () => {
    const result = evaluateOrderAcceptance({
      ...pending,
      paymentMethod: "KHALTI",
      paymentStatus: "PAID",
    });
    expect(result.allowed).toBe(true);
    expect(result.payment.isPaid).toBe(true);
  });

  it("rejects non-pending orders even when paid", () => {
    const result = evaluateOrderAcceptance({
      ...pending,
      status: "CONFIRMED",
      paymentMethod: "ESEWA",
      paymentStatus: "PAID",
    });
    expect(result).toMatchObject({
      allowed: false,
      reason: expect.stringMatching(/only pending/i),
    });
  });

  it("rejects refunded and failed payment states", () => {
    expect(
      evaluateOrderAcceptance({ ...pending, paymentStatus: "REFUNDED" })
        .allowed,
    ).toBe(false);
    expect(
      evaluateOrderAcceptance({ ...pending, paymentStatus: "FAILED" }).allowed,
    ).toBe(false);
  });

  it("rejects unsupported payment methods instead of treating them as cash", () => {
    expect(
      evaluateOrderAcceptance({ ...pending, paymentMethod: "CARD" }).allowed,
    ).toBe(false);
  });
});

describe("paymentPresentation", () => {
  it("never labels COD as paid before collection", () => {
    expect(paymentPresentation("COD", "UNPAID")).toMatchObject({
      label: "Cash due",
      isPaid: false,
      isCashDue: true,
    });
  });

  it("labels online initiated payments as pending, not paid", () => {
    expect(paymentPresentation("ESEWA", "INITIATED")).toMatchObject({
      label: "Payment pending",
      isPaid: false,
    });
  });
});

describe("orderServiceSummary", () => {
  it("includes delivery address and dine-in table details", () => {
    expect(
      orderServiceSummary({
        type: "DELIVERY",
        deliveryAddress: "Biratnagar",
      }),
    ).toBe("Delivery · Biratnagar");
    expect(orderServiceSummary({ type: "DINE_IN", tableNumber: "4" })).toBe(
      "Dine-in · Table 4",
    );
  });
});
