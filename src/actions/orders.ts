"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations";
import {
  assertSameOrigin,
  getClientIp,
  getCurrentUser,
} from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatNPR } from "@/lib/money";
import {
  getEsewaConfig,
  getKhaltiConfig,
  getPaymentMode,
  isMockPaymentAllowed,
  lookupEsewaTransaction,
  lookupKhaltiPayment,
  markOrderPaid,
  markPaymentFailed,
  parseEsewaAmount,
} from "@/lib/payments";
import { writeAuditLog } from "@/lib/audit";
import { createStaffNotification } from "@/lib/notifications";
import { couponService, orderService } from "@/lib/services";

export type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNumber: string;
      publicToken: string;
      confirmationUrl: string;
      paymentMethod: string;
      digitalPayment: boolean;
    }
  | { success: false; message: string };

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002",
  );
}

export type CouponResult =
  | {
      success: true;
      code: string;
      description: string | null;
      discount: number;
      message: string;
    }
  | { success: false; message: string };

export async function validateCouponAction(
  codeInput: string,
  subtotal: number,
): Promise<CouponResult> {
  const code = codeInput.trim().toUpperCase();
  if (!code) return { success: false, message: "Enter a coupon code." };
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { success: false, message: "Add something to your cart first." };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`coupon:${ip}`, 12, 60_000);
  if (!limit.success) {
    return { success: false, message: "Too many attempts. Try again shortly." };
  }

  const result = await couponService.validateCoupon(code, subtotal);
  if (!result.valid) return { success: false, message: result.message };

  return {
    success: true,
    code: result.coupon.code,
    description: result.coupon.description,
    discount: result.coupon.discount,
    message: result.message,
  };
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`order:${ip}`, 8, 10 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        message:
          "Too many order attempts. Please wait a few minutes or call us.",
      };
    }

    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ??
          "Please check your delivery and payment details.",
      };
    }

    const user = await getCurrentUser();
    const result = await orderService.createOrder(
      parsed.data,
      user ? { id: user.id, email: user.email } : null,
    );

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    return {
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      publicToken: result.publicToken,
      confirmationUrl: result.confirmationUrl,
      paymentMethod: result.paymentMethod,
      digitalPayment: result.digitalPayment,
    };
  } catch (error) {
    console.error("Create order failed", error);
    return {
      success: false,
      message:
        "Something went wrong while placing your order. Please try again or call us.",
    };
  }
}

export async function cancelOrderAction(
  orderId: string,
  token: string | null,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await assertSameOrigin();
    const user = await getCurrentUser();
    const result = await orderService.cancelOrder(
      orderId,
      reason,
      user?.id,
      token,
      false,
    );

    if (result.success) {
      revalidatePath("/account/orders");
      revalidatePath("/admin/orders");
    }

    return result;
  } catch (error) {
    console.error("Cancel order failed", error);
    return {
      success: false,
      message: "We couldn't cancel this order. Please call us.",
    };
  }
}

export async function trackOrderAction(
  orderNumberInput: string,
  phoneInput: string,
): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`track:${ip}`, 15, 10 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many lookups. Please wait a few minutes.",
      };
    }

    const orderNumber = orderNumberInput.trim().toUpperCase();
    const phone = phoneInput.replace(/\D/g, "");
    if (!orderNumber || phone.length < 7) {
      return {
        success: false,
        message: "Enter your order number and the phone used to order.",
      };
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { publicToken: true, customerPhone: true, orderNumber: true },
    });
    // Compare the final ten digits, which is the full Nepali mobile number.
    // Accept shorter stored landlines only when the whole number matches; do
    // not accept a 7-digit suffix of a mobile number.
    const storedPhone =
      order?.customerPhone.replace(/\D/g, "").slice(-10) ?? "";
    const providedPhone = phone.slice(-10);
    const matches =
      storedPhone.length >= 7 &&
      providedPhone.length >= 7 &&
      storedPhone === providedPhone;

    if (!order || !matches) {
      return {
        success: false,
        message:
          "We couldn't find an order with those details. Check both and try again.",
      };
    }

    return {
      success: true,
      url: `/order/${order.orderNumber}?token=${encodeURIComponent(order.publicToken)}`,
    };
  } catch (error) {
    console.error("Track order failed", error);
    return {
      success: false,
      message: "We couldn't look up that order right now. Please try again.",
    };
  }
}

function paymentPayloadMeta(payload: string | null) {
  if (!payload) return {} as Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

/**
 * Re-checks a pending online payment directly with the provider. Useful when
 * the customer closed the callback tab, the callback failed transiently, or
 * they want to confirm after paying.
 */
export async function verifyOnlinePaymentAction(
  orderId: string,
  token: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`payment-verify:${ip}`, 20, 60_000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many checks. Please wait a minute and try again.",
      };
    }

    const user = await getCurrentUser();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        publicToken: true,
        userId: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
      },
    });
    if (
      !order ||
      (order.publicToken !== token && (!user || order.userId !== user.id))
    ) {
      return { success: false, message: "Order not found." };
    }
    if (order.paymentStatus === "PAID") {
      return { success: true, message: "This payment is already confirmed." };
    }
    if (order.status === "CANCELLED") {
      return {
        success: false,
        message: "This order is cancelled and can no longer be paid.",
      };
    }
    if (!["ESEWA", "KHALTI"].includes(order.paymentMethod)) {
      return {
        success: false,
        message: "This order does not use an online payment.",
      };
    }

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: order.paymentMethod },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });
    const meta = paymentPayloadMeta(payment?.payload ?? null);

    if (order.paymentMethod === "ESEWA") {
      const config = getEsewaConfig();
      const transactionUuid =
        typeof meta.transactionUuid === "string" ? meta.transactionUuid : null;
      if (!config || !transactionUuid) {
        return {
          success: false,
          message:
            "We could not find the eSewa transaction to verify. Start the payment again.",
        };
      }

      const lookup = await lookupEsewaTransaction({
        config,
        transactionUuid,
        totalAmountNpr: String(order.total / 100),
      });
      if (!lookup.ok) {
        return {
          success: false,
          message:
            "eSewa has not responded yet. If money left your wallet, wait a minute and check again.",
        };
      }

      const status = (lookup.data.status ?? "").toUpperCase();
      const lookupAmount = parseEsewaAmount(lookup.data.total_amount);
      const matches =
        status === "COMPLETE" &&
        Number.isFinite(lookupAmount) &&
        Math.abs(lookupAmount - order.total / 100) <= 0.02 &&
        (!lookup.data.transaction_uuid ||
          lookup.data.transaction_uuid === transactionUuid) &&
        (!lookup.data.product_code ||
          lookup.data.product_code === config.merchantCode);

      if (matches) {
        const paid = await markOrderPaid({
          orderId: order.id,
          provider: "ESEWA",
          transactionId: lookup.data.ref_id ?? `ESEWA-${transactionUuid}`,
          payload: { lookup: lookup.data, mode: config.mode },
          note: "eSewa payment manually re-verified by status lookup.",
        });
        revalidatePath(`/order/${order.orderNumber}`);
        return paid.ok
          ? {
              success: true,
              message: "Payment confirmed. Your order is with the kitchen.",
            }
          : { success: false, message: paid.reason };
      }

      if (["PENDING", "AMBIGUOUS"].includes(status)) {
        return {
          success: false,
          message:
            "eSewa is still processing this payment. Please check again in a minute.",
        };
      }

      await markPaymentFailed({
        orderId: order.id,
        provider: "ESEWA",
        reason: `Manual eSewa verification returned ${status || "unknown"}.`,
        payload: lookup.data,
      });
      revalidatePath(`/order/${order.orderNumber}`);
      return {
        success: false,
        message:
          "eSewa did not confirm this payment. If money left your wallet, please call us before trying again.",
      };
    }

    const config = getKhaltiConfig();
    const pidx = typeof meta.pidx === "string" ? meta.pidx : null;
    if (!config || !pidx) {
      return {
        success: false,
        message:
          "We could not find the Khalti transaction to verify. Start the payment again.",
      };
    }

    const lookup = await lookupKhaltiPayment({ config, pidx });
    if (!lookup.ok) {
      return {
        success: false,
        message:
          "Khalti has not responded yet. If money left your wallet, wait a minute and check again.",
      };
    }

    const status = (lookup.data.status ?? "").toLowerCase();
    const matches =
      status === "completed" &&
      lookup.data.total_amount === order.total &&
      (!lookup.data.pidx || lookup.data.pidx === pidx) &&
      (!lookup.data.purchase_order_id ||
        lookup.data.purchase_order_id === order.orderNumber);

    if (matches && lookup.data.transaction_id) {
      const paid = await markOrderPaid({
        orderId: order.id,
        provider: "KHALTI",
        transactionId: lookup.data.transaction_id,
        payload: { lookup: lookup.data, mode: config.mode },
        note: "Khalti payment manually re-verified by lookup.",
      });
      revalidatePath(`/order/${order.orderNumber}`);
      return paid.ok
        ? {
            success: true,
            message: "Payment confirmed. Your order is with the kitchen.",
          }
        : { success: false, message: paid.reason };
    }

    if (["pending", "initiated"].includes(status)) {
      return {
        success: false,
        message:
          "Khalti is still processing this payment. Please check again in a minute.",
      };
    }

    await markPaymentFailed({
      orderId: order.id,
      provider: "KHALTI",
      reason: `Manual Khalti verification returned ${lookup.data.status ?? "unknown"}.`,
      payload: lookup.data,
    });
    revalidatePath(`/order/${order.orderNumber}`);
    return {
      success: false,
      message:
        "Khalti did not confirm this payment. If money left your wallet, please call us before trying again.",
    };
  } catch (error) {
    console.error("Online payment verification failed", error);
    return {
      success: false,
      message: "We could not check the payment right now. Please try again.",
    };
  }
}

export async function mockPayAction(
  orderId: string,
  token: string,
): Promise<{ success: boolean; message: string }> {
  if (getPaymentMode() !== "mock" || !isMockPaymentAllowed()) {
    return { success: false, message: "Demo payment is not enabled." };
  }
  try {
    await assertSameOrigin();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.publicToken !== token) {
      return { success: false, message: "Order not found." };
    }
    if (order.paymentStatus === "PAID") {
      return { success: true, message: "This order is already paid." };
    }
    if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") {
      return { success: false, message: "This order is no longer payable." };
    }

    const transactionId = `MOCK-${Date.now()}`;
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

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PAID",
          transactionId,
          payload: JSON.stringify({
            mode: "mock",
            provider: order.paymentMethod,
          }),
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: "Sandbox payment marked as successful. No real money moved.",
          changedBy: "System (mock payment)",
        },
      });
      await createStaffNotification(tx, {
        eventKey: `payment:${order.id}:mock-paid`,
        type: "PAYMENT",
        title: `Sandbox payment received for ${order.orderNumber}`,
        message: `${formatNPR(order.total)} · no real money moved.`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });
      return true;
    });

    if (!changed) {
      const fresh = await prisma.order.findUnique({
        where: { id: order.id },
        select: { paymentStatus: true },
      });
      if (fresh?.paymentStatus === "PAID") {
        return { success: true, message: "This order is already paid." };
      }
      return { success: false, message: "This order is no longer payable." };
    }

    revalidatePath(`/order/${order.orderNumber}`);
    revalidatePath("/admin/orders");
    return {
      success: true,
      message: "Sandbox payment successful. Your order is with the kitchen.",
    };
  } catch (error) {
    console.error("Mock payment failed", error);
    return {
      success: false,
      message: "We couldn't complete the sandbox payment.",
    };
  }
}

const reviewInputSchema = z.object({
  orderId: z.string().min(1),
  token: z.string().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().or(z.literal("")),
  comment: z
    .string()
    .trim()
    .min(5, "Tell us a little about your meal.")
    .max(1500),
});

export async function submitReviewAction(input: {
  orderId: string;
  token?: string | null;
  rating: number;
  title?: string;
  comment: string;
}): Promise<{ success: boolean; message: string }> {
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your review.",
    };
  }

  try {
    await assertSameOrigin();
    const user = await getCurrentUser();
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { review: true },
    });

    if (!order) return { success: false, message: "Order not found." };
    const authorized =
      (user && order.userId === user.id) ||
      (parsed.data.token && order.publicToken === parsed.data.token);
    if (!authorized) {
      return { success: false, message: "You cannot review this order." };
    }
    if (order.status !== "COMPLETED") {
      return {
        success: false,
        message: "You can leave a review once your order is completed.",
      };
    }
    if (order.review) {
      return {
        success: false,
        message: "You have already reviewed this order.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          userId: user?.id ?? order.userId,
          orderId: order.id,
          rating: parsed.data.rating,
          title: parsed.data.title || null,
          comment: parsed.data.comment,
        },
      });

      await tx.notification.upsert({
        where: { eventKey: `review:${review.id}:created` },
        update: {},
        create: {
          eventKey: `review:${review.id}:created`,
          type: "REVIEW",
          title: "New review awaiting moderation",
          message: `Order ${order.orderNumber} · review awaiting moderation.`,
          link: "/admin/reviews",
          orderId: order.id,
          isTest: order.isTest,
        },
      });
    });

    after(async () => {
      await writeAuditLog({
        userId: user?.id,
        actorEmail: user?.email ?? order.customerEmail,
        action: "review.submit",
        entity: "Review",
        entityId: order.id,
        details: { orderNumber: order.orderNumber, rating: parsed.data.rating },
      });
    });

    revalidatePath(`/order/${order.orderNumber}`);
    revalidatePath("/account/orders");
    revalidatePath("/admin/reviews");
    return {
      success: true,
      message: "Thank you — your review is with our team for approval.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        message: "You have already reviewed this order.",
      };
    }
    console.error("Submit review failed", error);
    return {
      success: false,
      message: "We couldn't save your review right now. Please try again.",
    };
  }
}
