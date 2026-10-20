import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  asAbsoluteUrl,
  getEsewaConfig,
  lookupEsewaTransaction,
  markOrderPaid,
  markPaymentFailed,
  parseEsewaAmount,
  parseEsewaCallbackData,
  verifyEsewaSignature,
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

function storedTransactionUuid(payload: string | null) {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { transactionUuid?: unknown };
    return typeof parsed.transactionUuid === "string"
      ? parsed.transactionUuid
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ result: string; orderId: string; token: string }>;
  },
) {
  const { result, orderId, token } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order || !token || order.publicToken !== token) {
    return new Response("Order not found.", { status: 404 });
  }
  if (order.paymentMethod !== "ESEWA") {
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "This order is not set to pay with eSewa.",
    );
  }
  if (order.paymentStatus === "PAID") {
    return redirectToOrder(order.orderNumber, token, "success");
  }
  if (result !== "success" && result !== "failure") {
    return new Response("Unknown payment result.", { status: 400 });
  }

  const config = getEsewaConfig();
  if (!config) {
    return redirectToOrder(
      order.orderNumber,
      token,
      "pending",
      "eSewa verification is not configured on this server. Please contact the restaurant before paying again.",
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: "ESEWA" },
    orderBy: { createdAt: "desc" },
    select: { payload: true },
  });
  const initiatedTransaction = storedTransactionUuid(payment?.payload ?? null);
  const expected = order.total / 100;

  // eSewa uses failure_url for both failed and pending transactions, so check
  // the initiated transaction with the status API before declaring failure.
  if (result === "failure") {
    if (!initiatedTransaction) {
      await markPaymentFailed({
        orderId: order.id,
        provider: "ESEWA",
        reason:
          "Customer returned from eSewa without an initiated transaction.",
      });
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "The eSewa payment was not completed.",
      );
    }

    const lookup = await lookupEsewaTransaction({
      config,
      transactionUuid: initiatedTransaction,
      totalAmountNpr: String(expected),
    });
    if (!lookup.ok) {
      console.error("eSewa lookup unavailable after failure redirect", {
        orderNumber: order.orderNumber,
        transient: lookup.transient,
        reason: lookup.reason,
      });
      return redirectToOrder(
        order.orderNumber,
        token,
        "pending",
        "We could not confirm the eSewa result yet. If money left your wallet, please refresh in a minute.",
      );
    }

    const status = (lookup.data.status ?? "").toUpperCase();
    const lookupAmount = parseEsewaAmount(lookup.data.total_amount);
    const amountMatches =
      Number.isFinite(lookupAmount) &&
      Math.abs(lookupAmount - expected) <= 0.02;

    if (status === "COMPLETE" && amountMatches) {
      const paid = await markOrderPaid({
        orderId: order.id,
        provider: "ESEWA",
        transactionId: lookup.data.ref_id ?? `ESEWA-${initiatedTransaction}`,
        payload: { lookup: lookup.data, mode: config.mode },
        note: "eSewa completed payment verified after failure redirect.",
      });
      if (!paid.ok) {
        return redirectToOrder(order.orderNumber, token, "failed", paid.reason);
      }
      return redirectToOrder(order.orderNumber, token, "success");
    }

    if (["PENDING", "AMBIGUOUS"].includes(status)) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "pending",
        "eSewa has not completed the payment yet. If money left your wallet, wait a minute and check again.",
      );
    }

    await markPaymentFailed({
      orderId: order.id,
      provider: "ESEWA",
      reason: `eSewa failed redirect confirmed with status ${status || "unknown"}.`,
      payload: lookup.data,
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      status === "COMPLETE"
        ? "eSewa returned an amount that did not match this order. Please call us."
        : "The eSewa payment was not completed.",
    );
  }

  const data = request.nextUrl.searchParams.get("data");
  const payload = data ? parseEsewaCallbackData(data) : null;
  if (!payload) {
    await markPaymentFailed({
      orderId: order.id,
      provider: "ESEWA",
      reason: "Missing or unreadable eSewa callback data.",
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "We could not verify the eSewa response.",
    );
  }

  const signatureValid = verifyEsewaSignature(payload, config.secretKey);
  const callbackStatus = (payload.status ?? "").toUpperCase();
  const amount = parseEsewaAmount(payload.total_amount);
  const transactionUuid = payload.transaction_uuid ?? "";
  const referenceMatches = transactionUuid.startsWith(`${order.orderNumber}-`);
  const productMatches = payload.product_code === config.merchantCode;

  if (
    !signatureValid ||
    !Number.isFinite(amount) ||
    Math.abs(amount - expected) > 0.02 ||
    !referenceMatches ||
    !productMatches
  ) {
    await markPaymentFailed({
      orderId: order.id,
      provider: "ESEWA",
      reason: !signatureValid
        ? "eSewa signature verification failed."
        : "eSewa returned details that did not match this order.",
      payload: {
        signatureValid,
        status: payload.status,
        amount,
        transactionUuid,
        initiatedTransaction,
        productCode: payload.product_code,
        expectedProductCode: config.merchantCode,
      },
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "The eSewa payment could not be verified. No charge was accepted by us.",
    );
  }

  if (callbackStatus !== "COMPLETE") {
    if (["PENDING", "AMBIGUOUS"].includes(callbackStatus)) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "pending",
        "eSewa has not completed the payment yet. If money left your wallet, wait a minute and check again.",
      );
    }
    await markPaymentFailed({
      orderId: order.id,
      provider: "ESEWA",
      reason: `eSewa returned status ${payload.status ?? "unknown"}.`,
      payload,
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "The eSewa payment was not completed.",
    );
  }

  // Never trust the redirect alone: confirm the transaction server-to-server.
  const lookup = await lookupEsewaTransaction({
    config,
    transactionUuid,
    totalAmountNpr: String(expected),
  });
  if (!lookup.ok) {
    console.error("eSewa lookup unavailable after successful callback", {
      orderNumber: order.orderNumber,
      transient: lookup.transient,
      reason: lookup.reason,
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "pending",
      "eSewa accepted the payment but our verification check is temporarily unavailable. Please refresh in a minute.",
    );
  }

  const lookupStatus = (lookup.data.status ?? "").toUpperCase();
  const lookupAmount = parseEsewaAmount(lookup.data.total_amount);
  const lookupMatches =
    lookupStatus === "COMPLETE" &&
    (!lookup.data.transaction_uuid ||
      lookup.data.transaction_uuid === transactionUuid) &&
    (!lookup.data.product_code ||
      lookup.data.product_code === config.merchantCode) &&
    Number.isFinite(lookupAmount) &&
    Math.abs(lookupAmount - expected) <= 0.02;

  if (!lookupMatches) {
    if (["PENDING", "AMBIGUOUS"].includes(lookupStatus)) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "pending",
        "eSewa is still finalising this payment. Please check again shortly.",
      );
    }
    await markPaymentFailed({
      orderId: order.id,
      provider: "ESEWA",
      reason: "eSewa transaction lookup did not confirm a completed payment.",
      payload: { callback: payload, lookup: lookup.data },
    });
    return redirectToOrder(
      order.orderNumber,
      token,
      "failed",
      "eSewa did not confirm this payment. If money left your wallet, please call us before trying again.",
    );
  }

  const transactionId =
    payload.transaction_code ||
    lookup.data.ref_id ||
    `ESEWA-${transactionUuid}`;
  const paid = await markOrderPaid({
    orderId: order.id,
    provider: "ESEWA",
    transactionId,
    payload: { callback: payload, lookup: lookup.data, mode: config.mode },
    note: "eSewa payment verified by signature, amount and status lookup.",
  });

  if (!paid.ok) {
    return redirectToOrder(order.orderNumber, token, "failed", paid.reason);
  }
  return redirectToOrder(order.orderNumber, token, "success");
}
