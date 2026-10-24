import "server-only";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/constants";
import { normalizeAppUrl } from "@/lib/app-url";
import { formatNPR } from "@/lib/money";
import { sendAdminNotification, sendOrderConfirmation } from "@/lib/email";
import { createStaffNotification } from "@/lib/notifications";
import {
  getSandboxPaymentExpiry,
  isMockPaymentAllowed,
  isPaymentModeAllowed,
  isSandboxPaymentAllowed,
  isTestPaymentModeAllowed,
  type PaymentDisplayMode,
  type PaymentMode,
} from "@/lib/payment-mode";

export {
  getSandboxPaymentExpiry,
  isMockPaymentAllowed,
  isPaymentModeAllowed,
  isSandboxPaymentAllowed,
  isTestPaymentModeAllowed,
};
export type { PaymentDisplayMode, PaymentMode };

export function getPaymentMode(): PaymentMode {
  const value = (process.env.PAYMENT_MODE ?? "mock").toLowerCase();
  if (value === "sandbox") return "sandbox";
  if (value === "live" || value === "production") return "live";
  return "mock";
}

export const PAYMENT_MODE = getPaymentMode();

export interface EsewaConfig {
  mode: Exclude<PaymentMode, "mock">;
  formUrl: string;
  statusUrl: string;
  merchantCode: string;
  secretKey: string;
}

export interface KhaltiConfig {
  mode: Exclude<PaymentMode, "mock">;
  baseUrl: string;
  secretKey: string;
}

const ESEWA_SANDBOX_FORM = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_LIVE_FORM = "https://epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_SANDBOX_STATUS =
  "https://rc.esewa.com.np/api/epay/transaction/status/";
const ESEWA_LIVE_STATUS =
  "https://epay.esewa.com.np/api/epay/transaction/status/";
const KHALTI_SANDBOX_BASE = "https://dev.khalti.com/api/v2";
const KHALTI_LIVE_BASE = "https://khalti.com/api/v2";

/**
 * Sandbox credentials published by eSewa. They are intentionally public and
 * only ever used while PAYMENT_MODE=sandbox. Live payments require real keys.
 */
const ESEWA_SANDBOX_MERCHANT = "EPAYTEST";
const ESEWA_SANDBOX_SECRET = "8gBm/:&EnhH.1/q";

/**
 * Public sandbox key from Khalti's own web-checkout documentation. It points
 * at Khalti's demo merchant and moves test money only. Set KHALTI_SECRET_KEY
 * to your own `live_secret_key` from test-admin.khalti.com to see the
 * transactions in your merchant dashboard.
 */
const KHALTI_SANDBOX_DEMO_SECRET =
  "live_secret_key_68791341fdd94846a146f0457ff7b455";

function esewaStatusUrl(formUrl: string, mode: "sandbox" | "live") {
  if (process.env.ESEWA_STATUS_URL) return process.env.ESEWA_STATUS_URL;
  try {
    const url = new URL(formUrl);
    if (url.hostname === "rc-epay.esewa.com.np") return ESEWA_SANDBOX_STATUS;
    if (url.hostname === "epay.esewa.com.np") return ESEWA_LIVE_STATUS;
    if (url.pathname.includes("/api/epay/main/v2/form")) {
      return `${url.origin}${url.pathname.replace(
        "/api/epay/main/v2/form",
        "/api/epay/transaction/status/",
      )}`;
    }
  } catch {
    // Fall back to the official environment endpoint below.
  }
  return mode === "sandbox" ? ESEWA_SANDBOX_STATUS : ESEWA_LIVE_STATUS;
}

function esewaEnvironment(formUrl: string): "sandbox" | "live" | "unknown" {
  try {
    const host = new URL(formUrl).hostname.toLowerCase();
    if (
      host === "rc-epay.esewa.com.np" ||
      host === "rc.esewa.com.np" ||
      host === "uat.esewa.com.np"
    ) {
      return "sandbox";
    }
    if (host === "epay.esewa.com.np" || host === "esewa.com.np") {
      return "live";
    }
  } catch {
    return "unknown";
  }
  return "unknown";
}

function khaltiEnvironment(baseUrl: string): "sandbox" | "live" | "unknown" {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (host === "dev.khalti.com" || host.endsWith(".dev.khalti.com")) {
      return "sandbox";
    }
    if (host === "khalti.com" || host === "a.khalti.com") return "live";
  } catch {
    return "unknown";
  }
  return "unknown";
}

export function getEsewaConfig(): EsewaConfig | null {
  const mode = getPaymentMode();
  if (mode === "mock") return null;
  if (mode === "sandbox" && !isSandboxPaymentAllowed()) return null;

  const merchantCode =
    process.env.ESEWA_MERCHANT_CODE?.trim() ||
    (mode === "sandbox" ? ESEWA_SANDBOX_MERCHANT : "");
  const secretKey =
    process.env.ESEWA_SECRET_KEY?.trim() ||
    (mode === "sandbox" ? ESEWA_SANDBOX_SECRET : "");
  if (!merchantCode || !secretKey) return null;

  const formUrl =
    process.env.ESEWA_BASE_URL?.trim() ||
    (mode === "sandbox" ? ESEWA_SANDBOX_FORM : ESEWA_LIVE_FORM);

  const environment = esewaEnvironment(formUrl);
  if (environment !== "unknown" && environment !== mode) {
    console.error(
      `ESEWA_BASE_URL points at the ${environment} environment while PAYMENT_MODE=${mode}. Refusing to start eSewa.`,
    );
    return null;
  }

  const statusUrl = esewaStatusUrl(formUrl, mode);
  const statusEnvironment = esewaEnvironment(statusUrl);
  if (statusEnvironment !== "unknown" && statusEnvironment !== mode) {
    console.error(
      `ESEWA_STATUS_URL points at the ${statusEnvironment} environment while PAYMENT_MODE=${mode}. Refusing to start eSewa.`,
    );
    return null;
  }

  return {
    mode,
    formUrl,
    statusUrl,
    merchantCode,
    secretKey,
  };
}

export function getKhaltiConfig(): KhaltiConfig | null {
  const mode = getPaymentMode();
  if (mode === "mock") return null;
  if (mode === "sandbox" && !isSandboxPaymentAllowed()) return null;

  const secretKey =
    process.env.KHALTI_SECRET_KEY?.trim() ||
    (mode === "sandbox" ? KHALTI_SANDBOX_DEMO_SECRET : "");
  if (!secretKey) return null;

  const fallbackBase =
    mode === "sandbox" ? KHALTI_SANDBOX_BASE : KHALTI_LIVE_BASE;
  const baseUrl = (process.env.KHALTI_BASE_URL?.trim() || fallbackBase).replace(
    /\/+$/,
    "",
  );

  const environment = khaltiEnvironment(baseUrl);
  if (environment !== "unknown" && environment !== mode) {
    console.error(
      `KHALTI_BASE_URL points at the ${environment} environment while PAYMENT_MODE=${mode}. Refusing to start Khalti.`,
    );
    return null;
  }

  return { mode, baseUrl, secretKey };
}

/**
 * True when sandbox mode is falling back to Khalti's public demo key instead
 * of the restaurant's own sandbox merchant key.
 */
export function isKhaltiDemoKey() {
  return (
    getPaymentMode() === "sandbox" && !process.env.KHALTI_SECRET_KEY?.trim()
  );
}

/**
 * In mock mode the UI still offers online methods so the simulated payment
 * flow can be exercised. In sandbox/live mode a provider is only offered when
 * its server-side credentials are present. Neither test mode is offered when
 * the runtime blocks test payments.
 */
export function onlinePaymentAvailability() {
  const mode = getPaymentMode();
  const mockAllowed = isMockPaymentAllowed();
  return {
    mode,
    esewa: mode === "mock" ? mockAllowed : Boolean(getEsewaConfig()),
    khalti: mode === "mock" ? mockAllowed : Boolean(getKhaltiConfig()),
  };
}

/**
 * The mode safe to show in the customer UI. A blocked test mode becomes an
 * explicit "unavailable" state rather than a button that would fail later.
 */
export function paymentModeForDisplay(): PaymentDisplayMode {
  const mode = getPaymentMode();
  return isPaymentModeAllowed(mode) ? mode : "unavailable";
}

export function paymentModeLabel(mode = getPaymentMode()) {
  if (mode === "sandbox") return "Sandbox";
  if (mode === "live") return "Secure";
  return "Demo";
}

export function appUrl() {
  return normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL ?? SITE.url);
}

export function asAbsoluteUrl(path: string) {
  return new URL(path, `${appUrl()}/`).toString();
}

// Pure eSewa crypto and payload helpers live in `payment-crypto.ts` so they
// can be unit tested without the server-only payment module.
export {
  parseEsewaAmount,
  parseEsewaCallbackData,
  signEsewa,
  verifyEsewaSignature,
} from "@/lib/payment-crypto";

export interface EsewaStatusData {
  product_code?: string;
  transaction_uuid?: string;
  total_amount?: string | number;
  status?: string;
  ref_id?: string | null;
  error_message?: string;
}

export async function lookupEsewaTransaction({
  config,
  transactionUuid,
  totalAmountNpr,
}: {
  config: EsewaConfig;
  transactionUuid: string;
  totalAmountNpr: string;
}) {
  try {
    const url = new URL(config.statusUrl);
    url.searchParams.set("product_code", config.merchantCode);
    url.searchParams.set("total_amount", totalAmountNpr);
    url.searchParams.set("transaction_uuid", transactionUuid);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let data: EsewaStatusData = {};
    try {
      data = JSON.parse(raw) as EsewaStatusData;
    } catch {
      return {
        ok: false as const,
        transient: true,
        reason: "eSewa returned an unreadable status response.",
      };
    }

    if (!response.ok || data.error_message) {
      return {
        ok: false as const,
        transient: true,
        reason:
          data.error_message ??
          `eSewa status lookup returned HTTP ${response.status}.`,
      };
    }

    return { ok: true as const, data };
  } catch (error) {
    console.error("eSewa status lookup failed", error);
    return {
      ok: false as const,
      transient: true,
      reason: "eSewa status lookup could not be reached.",
    };
  }
}

export interface KhaltiLookupData {
  pidx?: string;
  total_amount?: number;
  status?: string;
  transaction_id?: string;
  fee?: number;
  refunded?: boolean;
  purchase_order_id?: string;
  purchase_order_name?: string;
  detail?: string;
  error_message?: string;
}

export async function lookupKhaltiPayment({
  config,
  pidx,
}: {
  config: KhaltiConfig;
  pidx: string;
}) {
  try {
    const response = await fetch(`${config.baseUrl}/epayment/lookup/`, {
      method: "POST",
      headers: {
        Authorization: `key ${config.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pidx }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let data: KhaltiLookupData = {};
    try {
      data = JSON.parse(raw) as KhaltiLookupData;
    } catch {
      return {
        ok: false as const,
        transient: true,
        data,
        reason: "Khalti returned an unreadable lookup response.",
      };
    }

    if (!response.ok) {
      return {
        ok: false as const,
        transient: response.status >= 500,
        data,
        reason:
          data.detail ??
          data.error_message ??
          `Khalti lookup returned HTTP ${response.status}.`,
      };
    }

    return { ok: true as const, data };
  } catch (error) {
    console.error("Khalti lookup failed", error);
    return {
      ok: false as const,
      transient: true,
      data: {} as KhaltiLookupData,
      reason: "Khalti lookup could not be reached.",
    };
  }
}

/**
 * Only redirect to a Khalti-owned host. This prevents an unexpected provider
 * response from turning our initiate route into an open redirect.
 */
export function isAllowedKhaltiPaymentUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "khalti.com" ||
      host.endsWith(".khalti.com") ||
      host === "test-pay.khalti.com"
    );
  } catch {
    return false;
  }
}

export async function markOrderPaid({
  orderId,
  provider,
  transactionId,
  payload,
  note,
}: {
  orderId: string;
  provider: string;
  transactionId: string;
  payload: unknown;
  note: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      type: true,
      deliveryAddress: true,
      scheduledFor: true,
      total: true,
      paymentStatus: true,
      status: true,
      isTest: true,
      items: {
        select: {
          name: true,
          quantity: true,
          lineTotal: true,
        },
      },
    },
  });
  if (!order) return { ok: false as const, reason: "Order not found." };
  if (order.paymentStatus === "PAID") {
    return { ok: true as const, alreadyPaid: true, order };
  }
  if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") {
    return { ok: false as const, reason: "This order is no longer payable." };
  }

  const serialisedPayload = JSON.stringify(payload).slice(0, 20_000);
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { notIn: ["PAID", "REFUNDED"] },
        status: { not: "CANCELLED" },
      },
      data: { paymentStatus: "PAID" },
    });
    if (updated.count !== 1) return false;

    const existing = await tx.payment.findFirst({
      where: { orderId: order.id, provider },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await tx.payment.update({
        where: { id: existing.id },
        data: {
          status: "PAID",
          transactionId,
          amount: order.total,
          payload: serialisedPayload,
        },
      });
      await tx.payment.updateMany({
        where: {
          orderId: order.id,
          id: { not: existing.id },
          status: { in: ["INITIATED", "PENDING"] },
        },
        data: { status: "FAILED", payload: serialisedPayload },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider,
          amount: order.total,
          status: "PAID",
          transactionId,
          payload: serialisedPayload,
        },
      });
    }
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        note,
        changedBy: `Payment gateway (${provider})`,
      },
    });
    await createStaffNotification(tx, {
      eventKey: `payment:${order.id}:paid`,
      type: "PAYMENT",
      title: `Payment verified for ${order.orderNumber}`,
      message: `${formatNPR(order.total)} via ${provider}.`,
      link: `/admin/orders/${order.id}`,
      orderId: order.id,
      isTest: order.isTest,
    });
    await createStaffNotification(tx, {
      eventKey: `order:${order.id}:created`,
      type: "ORDER",
      title: `New paid order ${order.orderNumber} — ${provider}`,
      message: `${order.type} · ${formatNPR(order.total)} · Paid via ${provider}`,
      link: `/admin/orders/${order.id}`,
      orderId: order.id,
      isTest: order.isTest,
    });
    return true;
  });

  if (!changed) {
    const fresh = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        status: true,
      },
    });
    if (fresh?.paymentStatus === "PAID") {
      return { ok: true as const, alreadyPaid: true, order: fresh };
    }
    return { ok: false as const, reason: "This order is no longer payable." };
  }

  after(async () => {
    await sendOrderConfirmation({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      type: order.type,
      total: order.total,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      deliveryAddress: order.deliveryAddress,
      scheduledFor: order.scheduledFor,
    }).catch((error) => console.error("Order email failed", error));

    await sendAdminNotification(
      `Payment received — ${order.orderNumber}`,
      `<p style="font-size:14px;line-height:1.8;">We received <strong>${formatNPR(
        order.total,
      )}</strong> via ${escapeHtml(provider)}.</p><p style="font-size:12px;color:#666;">Transaction: ${escapeHtml(transactionId)}</p>`,
    ).catch(() => undefined);
  });

  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true as const, alreadyPaid: false, order };
}

export async function markPaymentFailed({
  orderId,
  provider,
  reason,
  payload,
}: {
  orderId: string;
  provider: string;
  reason: string;
  payload?: unknown;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      isTest: true,
      status: true,
    },
  });
  if (!order || order.paymentStatus === "PAID") return null;
  if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") {
    return null;
  }

  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { notIn: ["PAID", "REFUNDED"] },
        status: { not: "CANCELLED" },
      },
      data: { paymentStatus: "FAILED" },
    });
    if (updated.count !== 1) return false;

    await tx.payment.updateMany({
      where: {
        orderId: order.id,
        provider,
        status: { in: ["INITIATED", "PENDING"] },
      },
      data: {
        status: "FAILED",
        payload: JSON.stringify({ reason, response: payload ?? null }).slice(
          0,
          20_000,
        ),
      },
    });

    await createStaffNotification(tx, {
      eventKey: `payment:${order.id}:failed`,
      type: "PAYMENT",
      title: `Payment failed for ${order.orderNumber}`,
      message: `Provider: ${provider}. Review the order before contacting the customer.`,
      link: `/admin/orders/${order.id}`,
      orderId: order.id,
      isTest: order.isTest,
    });
    return true;
  });

  if (!changed) return null;
  revalidatePath(`/order/${order.orderNumber}`);
  return order;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
