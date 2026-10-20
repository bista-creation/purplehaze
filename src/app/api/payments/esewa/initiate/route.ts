import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PAYMENT_MODE,
  appUrl,
  asAbsoluteUrl,
  escapeHtml,
  getEsewaConfig,
  isPaymentModeAllowed,
  signEsewa,
} from "@/lib/payments";

function redirectToOrder(
  orderNumber: string,
  token: string,
  state: "failed" | "unavailable" | "success",
  reason?: string,
) {
  const query = new URLSearchParams({ token, payment: state });
  if (reason) query.set("reason", reason.slice(0, 180));
  return NextResponse.redirect(
    asAbsoluteUrl(`/order/${encodeURIComponent(orderNumber)}?${query}`),
    303,
  );
}

export async function POST(request: Request) {
  let orderId = "";
  let token = "";
  try {
    const form = await request.formData();
    orderId = String(form.get("orderId") ?? "");
    token = String(form.get("token") ?? "");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !token || order.publicToken !== token) {
      return new Response("Order not found.", { status: 404 });
    }
    if (order.paymentStatus === "PAID") {
      return redirectToOrder(order.orderNumber, token, "success");
    }
    if (order.status === "CANCELLED") {
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "Order cancelled.",
      );
    }
    if (order.paymentMethod !== "ESEWA") {
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "This order is not set to pay with eSewa.",
      );
    }
    if (!isPaymentModeAllowed(PAYMENT_MODE)) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "unavailable",
        "Test payments are disabled in this environment.",
      );
    }
    if (PAYMENT_MODE === "mock") {
      return redirectToOrder(
        order.orderNumber,
        token,
        "unavailable",
        "Demo mode is on. Use the test payment button.",
      );
    }

    const config = getEsewaConfig();
    if (!config) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "unavailable",
        "eSewa is not configured yet. Check the merchant code and secret key.",
      );
    }

    const totalAmount = (order.total / 100).toFixed(2);
    const transactionUuid = `${order.orderNumber}-${Date.now()}`;
    const successUrl = asAbsoluteUrl(
      `/api/payments/esewa/callback/success/${order.id}/${encodeURIComponent(token)}`,
    );
    const failureUrl = asAbsoluteUrl(
      `/api/payments/esewa/callback/failure/${order.id}/${encodeURIComponent(token)}`,
    );
    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const signature = signEsewa(
      `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${config.merchantCode}`,
      config.secretKey,
    );
    const formUrl = config.formUrl;

    const updateCount = await prisma.payment.updateMany({
      where: {
        orderId: order.id,
        provider: "ESEWA",
        status: { in: ["INITIATED", "PENDING", "FAILED", "UNPAID"] },
      },
      data: {
        status: "INITIATED",
        payload: JSON.stringify({
          transactionUuid,
          initiatedAt: new Date().toISOString(),
          environment: config.mode,
          formUrl: config.formUrl,
        }).slice(0, 20_000),
      },
    });
    if (updateCount.count === 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "ESEWA",
          amount: order.total,
          status: "INITIATED",
          payload: JSON.stringify({
            transactionUuid,
            initiatedAt: new Date().toISOString(),
          }).slice(0, 20_000),
        },
      });
    }

    const fields: Record<string, string> = {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: config.merchantCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    };

    const inputs = Object.entries(fields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
      )
      .join("\n");

    return new Response(
      `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecting to eSewa…</title>
<style>body{font-family:system-ui,sans-serif;background:#faf8ff;color:#1a1025;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:420px;padding:32px;text-align:center}button{background:#5b21b6;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer}</style>
</head>
<body>
<main>
<p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px;color:#7c3aed;font-weight:700">Purple Haze</p>
<h1 style="font-size:24px;margin:12px 0 8px">Taking you to eSewa</h1>
<p style="font-size:14px;line-height:1.65;color:#5c5568">Your order <strong>${escapeHtml(order.orderNumber)}</strong> is saved. If the payment page does not open automatically, use the button below.</p>
<form id="esewa-form" method="POST" action="${escapeHtml(formUrl)}">
${inputs}
<button type="submit">Continue to eSewa</button>
</form>
<p style="font-size:11px;color:#7c6f86;margin-top:24px">${escapeHtml(appUrl())}</p>
</main>
<script>document.getElementById("esewa-form").submit()</script>
</body>
</html>`,
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "referrer-policy": "no-referrer",
        },
      },
    );
  } catch (error) {
    console.error("eSewa initiation failed", error);
    if (orderId) {
      const order = await prisma.order
        .findUnique({ where: { id: orderId }, select: { orderNumber: true } })
        .catch(() => null);
      if (order && token) {
        return redirectToOrder(
          order.orderNumber,
          token,
          "failed",
          "We could not start eSewa payment. Please try again.",
        );
      }
    }
    return new Response("Could not start payment.", { status: 500 });
  }
}
