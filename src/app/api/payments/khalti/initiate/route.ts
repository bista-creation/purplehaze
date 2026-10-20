import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PAYMENT_MODE,
  asAbsoluteUrl,
  getKhaltiConfig,
  isAllowedKhaltiPaymentUrl,
  isPaymentModeAllowed,
} from "@/lib/payments";

type KhaltiInitResponse = {
  pidx?: string;
  payment_url?: string;
  expires_at?: string;
  expires_in?: number;
  error_key?: string;
  error_message?: string;
  detail?: string;
};

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
    if (order.paymentMethod !== "KHALTI") {
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "This order is not set to pay with Khalti.",
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

    const config = getKhaltiConfig();
    if (!config) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "unavailable",
        "Khalti is not configured yet. Add the sandbox secret key from test-admin.khalti.com.",
      );
    }
    if (order.total < 1000) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "Khalti requires a payment of at least Rs 10.",
      );
    }

    const returnUrl = asAbsoluteUrl(
      `/api/payments/khalti/callback/${order.id}/${encodeURIComponent(token)}`,
    );
    const response = await fetch(`${config.baseUrl}/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `key ${config.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        return_url: returnUrl,
        website_url: asAbsoluteUrl("/"),
        amount: order.total,
        purchase_order_id: order.orderNumber,
        purchase_order_name: `Purple Haze order ${order.orderNumber}`,
        customer_info: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
      }),
      cache: "no-store",
    });

    const raw = await response.text();
    let data: KhaltiInitResponse = {};
    try {
      data = JSON.parse(raw) as KhaltiInitResponse;
    } catch {
      // Keep the status code and avoid logging payment data.
    }

    if (!response.ok || !data.payment_url || !data.pidx) {
      console.error("Khalti initiation rejected", {
        status: response.status,
        detail:
          data.detail ?? data.error_message ?? data.error_key ?? "unknown",
      });
      await prisma.payment.updateMany({
        where: {
          orderId: order.id,
          provider: "KHALTI",
          status: { in: ["INITIATED", "PENDING", "FAILED", "UNPAID"] },
        },
        data: {
          status: "FAILED",
          payload: JSON.stringify({
            stage: "initiate",
            httpStatus: response.status,
            error: data.detail ?? data.error_message ?? data.error_key ?? null,
          }).slice(0, 20_000),
        },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "Khalti could not start the payment. Please try again or pay cash.",
      );
    }

    const paymentUrl = data.payment_url;
    if (!isAllowedKhaltiPaymentUrl(paymentUrl)) {
      return redirectToOrder(
        order.orderNumber,
        token,
        "failed",
        "Khalti returned an invalid payment link.",
      );
    }

    const updateCount = await prisma.payment.updateMany({
      where: {
        orderId: order.id,
        provider: "KHALTI",
        status: { in: ["INITIATED", "PENDING", "FAILED", "UNPAID"] },
      },
      data: {
        status: "INITIATED",
        payload: JSON.stringify({
          pidx: data.pidx,
          paymentUrl: data.payment_url,
          expiresAt: data.expires_at ?? null,
          initiatedAt: new Date().toISOString(),
        }).slice(0, 20_000),
      },
    });
    if (updateCount.count === 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "KHALTI",
          amount: order.total,
          status: "INITIATED",
          payload: JSON.stringify({
            pidx: data.pidx,
            paymentUrl: data.payment_url,
            expiresAt: data.expires_at ?? null,
            initiatedAt: new Date().toISOString(),
          }).slice(0, 20_000),
        },
      });
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "INITIATED" },
    });

    return NextResponse.redirect(paymentUrl, 303);
  } catch (error) {
    console.error("Khalti initiation failed", error);
    if (orderId) {
      const order = await prisma.order
        .findUnique({ where: { id: orderId }, select: { orderNumber: true } })
        .catch(() => null);
      if (order && token) {
        return redirectToOrder(
          order.orderNumber,
          token,
          "failed",
          "We could not start Khalti payment. Please try again.",
        );
      }
    }
    return new Response("Could not start payment.", { status: 500 });
  }
}
