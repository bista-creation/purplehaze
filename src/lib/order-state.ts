import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";

export type PaymentPresentation = {
  label: string;
  detail: string;
  tone: "green" | "amber" | "red" | "muted";
  isPaid: boolean;
  isCashDue: boolean;
};

export function isOnlinePaymentMethod(method: string) {
  return method === "ESEWA" || method === "KHALTI";
}

export function paymentPresentation(
  method: string,
  status: string,
): PaymentPresentation {
  const paymentStatus = status as PaymentStatus;
  const isCash = method === "COD";

  if (paymentStatus === "PAID") {
    return {
      label: "Paid",
      detail: isCash
        ? "Cash payment recorded as received."
        : "Verified by the payment provider.",
      tone: "green",
      isPaid: true,
      isCashDue: false,
    };
  }

  if (paymentStatus === "REFUNDED") {
    return {
      label: "Refunded",
      detail: "Refund recorded after manual completion in the provider or at the counter.",
      tone: "muted",
      isPaid: false,
      isCashDue: false,
    };
  }

  if (paymentStatus === "FAILED") {
    return {
      label: "Payment failed",
      detail: "The provider did not complete this payment.",
      tone: "red",
      isPaid: false,
      isCashDue: false,
    };
  }

  if (isCash) {
    return {
      label: "Cash due",
      detail: "Collect on delivery or at handover. Do not mark paid until cash is received.",
      tone: "amber",
      isPaid: false,
      isCashDue: true,
    };
  }

  return {
    label: "Payment pending",
    detail:
      "The customer has started an online payment. Acceptance is blocked until the provider verifies it.",
    tone: "amber",
    isPaid: false,
    isCashDue: false,
  };
}

export type AcceptanceDecision =
  | { allowed: true; payment: PaymentPresentation }
  | { allowed: false; reason: string; payment: PaymentPresentation };

/**
 * Business policy: an online order may only be accepted after the provider has
 * verified payment. Cash orders may be accepted with cash still due.
 */
export function evaluateOrderAcceptance(order: {
  status: string;
  type: string;
  paymentMethod: string;
  paymentStatus: string;
}): AcceptanceDecision {
  const payment = paymentPresentation(
    order.paymentMethod,
    order.paymentStatus,
  );

  if (order.status !== "PENDING") {
    return {
      allowed: false,
      reason: "Only pending orders can be accepted.",
      payment,
    };
  }

  if (!["COD", "ESEWA", "KHALTI"].includes(order.paymentMethod)) {
    return {
      allowed: false,
      reason: "This order has an unsupported payment method.",
      payment,
    };
  }

  if (isOnlinePaymentMethod(order.paymentMethod) && order.paymentStatus !== "PAID") {
    return {
      allowed: false,
      reason:
        "Online payment is not verified yet. Wait for the provider confirmation or ask the customer to recheck payment.",
      payment,
    };
  }

  if (!payment.isPaid && !payment.isCashDue) {
    return {
      allowed: false,
      reason: "This payment is not in an acceptable state.",
      payment,
    };
  }

  return { allowed: true, payment };
}

export function orderServiceSummary(order: {
  type: string;
  tableNumber?: string | null;
  deliveryAddress?: string | null;
}) {
  const label =
    ORDER_TYPE_LABELS[order.type as OrderType] ??
    order.type.replaceAll("_", " ").toLowerCase();
  if (order.type === "DINE_IN" && order.tableNumber) {
    return `${label} · Table ${order.tableNumber}`;
  }
  if (order.type === "DELIVERY" && order.deliveryAddress) {
    return `${label} · ${order.deliveryAddress}`;
  }
  return label;
}

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}
