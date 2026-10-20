import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  asAbsoluteUrl,
  getKhaltiConfig,
  lookupKhaltiPayment,
  markOrderPaid,
  markPaymentFailed,
} from "@/lib/payments";

function redirectToOrder(
  orderNumber: string,
  token: string,
  state: "success" | "failed" | "pending",
  reason?: string,
) {
  const query = new URLSearchParams({ token, payment: state });
  if (reason) query.set("reason", reason.slice(0, 180));
  return NextResponse.redirect(
    asAbsoluteUrl(`/order/${encodeURIComponent(orderNumber)}?${query}`),
    303,
  );
}

function storedPidx(payload: string | null) {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { pidx?: unknown };
    return typeof parsed.pidx === "string" ? parsed.pidx : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; token: string }> },
) {
  const { orderId, token } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order || !token || order.publicToken !== token) {
    return new Response("Order not found.", { status: 404 });
  }
  if (order.paymentMethod !== "KHALTI") {
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "This order is not set to pay with Khalti.",
    );
  }
  if (order.paymentStatus === "PAID") {
    return redirectToOrder(order.orderNumber, token, "success");
  }
  if (order.status === "CANCELLED") {
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "This order has been cancelled.",
    );
  }

  const pidx = request.nextUrl.searchParams.get("pidx");
  if (!pidx) {
    await markPaymentFailed({
      orderId: order.id,
      provider: "KHALTI",
      reason: "Khalti returned without a payment identifier.",
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "The Khalti payment was not completed.",
    );
  }

  const config = getKhaltiConfig();
  if (!config) {
    return redirectToOrder(
      order.orderNumber,
      token,
      "pending",
      "Khalti verification is not configured on this server. Please contact the restaurant before paying again.",
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: "KHALTI" },
    orderBy: { createdAt: "desc" },
    select: { payload: true },
  });
  const initiatedPidx = storedPidx(payment?.payload ?? null);
  if (initiatedPidx && initiatedPidx !== pidx) {
    await markPaymentFailed({
      orderId: order.id,
      provider: "KHALTI",
      reason: "Khalti callback pidx did not match the initiated payment.",
      payload: { callbackPidx: pidx, initiatedPidx },
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "The Khalti payment reference did not match this order.",
    );
  }

  const lookup = await lookupKhaltiPayment({ config, pidx });
  if (!lookup.ok) {
    console.error("Khalti lookup failed", {
      orderNumber: order.orderNumber,
      transient: lookup.transient,
      reason: lookup.reason,
    });
    if (lookup.transient) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "pending",
        "We could not reach Khalti to confirm the payment. If money left your wallet, please refresh in a minute.",
      );
    }
    await markPaymentFailed({
      orderId: order.id,
      provider: "KHALTI",
      reason: lookup.reason,
      payload: lookup.data,
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "Khalti could not confirm this payment. Please call us before trying again.",
    );
  }

  const data = lookup.data;
  const status = (data.status ?? "").toLowerCase();
  const lookupPidxMatches = !data.pidx || data.pidx === pidx;
  const amountMatches =
    typeof data.total_amount === "number" && data.total_amount === order.total;
  const referenceMatches =
    !data.purchase_order_id || data.purchase_order_id === order.orderNumber;

  if (!lookupPidxMatches || !amountMatches || !referenceMatches) {
    await markPaymentFailed({
      orderId: order.id,
      provider: "KHALTI",
      reason:
        "Khalti lookup pidx, amount or order reference did not match this order.",
      payload: {
        pidx,
        status: data.status,
        total_amount: data.total_amount,
        purchase_order_id: data.purchase_order_id,
        expected_amount: order.total,
        expected_order: order.orderNumber,
      },
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "The Khalti payment details did not match this order.",
    );
  }

  if (status === "completed" && data.transaction_id) {
    const paid = await markOrderPaid({
      orderId: order.id,
      provider: "KHALTI",
      transactionId: data.transaction_id,
      payload: { lookup: data, mode: config.mode },
      note: "Khalti payment verified by server-side lookup.",
    });
    if (!paid.ok) {
      return redirectToOrder(order.orderNumber, token, "failed", paid.reason);
    }
    return redirectToOrder(order.orderNumber, token, "success");
  }

  if (status === "pending" || status === "initiated") {
    return redirectToOrder(
      order.orderNumber,
      token,
      "pending",
      "Khalti has not completed the payment yet. If money left your wallet, please wait a minute and refresh.",
    );
  }

  await markPaymentFailed({
    orderId: order.id,
    provider: "KHALTI",
    reason: `Khalti returned status ${data.status ?? "unknown"}.`,
    payload: data,
  });
  return redirectToOrder(
    order.orderNumber,
    token,
    "failed",
    "The Khalti payment was not completed.",
  );
}
