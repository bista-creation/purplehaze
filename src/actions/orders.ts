"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations";
import {
  assertSameOrigin,
  generateSecureToken,
  getClientIp,
} from "@/lib/security";
import { getCurrentUser } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicSettings } from "@/lib/settings";
import {
  calculateCouponDiscount,
  calculateOrderTotals,
  formatNPR,
} from "@/lib/money";
import {
  getEsewaConfig,
  getKhaltiConfig,
  getPaymentMode,
  isTestPaymentModeAllowed,
  lookupEsewaTransaction,
  lookupKhaltiPayment,
  markOrderPaid,
  markPaymentFailed,
  onlinePaymentAvailability,
  parseEsewaAmount,
} from "@/lib/payments";
import { parseNepalDateTime } from "@/lib/time";
import { generateOrderNumber } from "@/lib/utils";
import {
  escapeHtml,
  sendAdminNotification,
  sendOrderConfirmation,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { createStaffNotification } from "@/lib/notifications";
import { ORDER_TYPE_LABELS } from "@/lib/constants";
import { paymentPresentation } from "@/lib/order-state";

class CouponUnavailableError extends Error {
  constructor() {
    super("Coupon is no longer available.");
    this.name = "CouponUnavailableError";
  }
}

export type CreateOrderResult =
  | {
      success: true;
      orderNumber: string;
      publicToken: string;
      confirmationUrl: string;
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

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) {
    return { success: false, message: "That coupon code is not valid." };
  }

  const result = calculateCouponDiscount(coupon, subtotal);
  if (!result.valid) return { success: false, message: result.reason };

  return {
    success: true,
    code: coupon.code,
    description: coupon.description,
    discount: result.discount,
    message: `Coupon applied — you saved ${formatNPR(result.discount)}.`,
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

    const { details, items, idempotencyKey } = parsed.data;

    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: { orderNumber: true, publicToken: true },
      });
      if (existing) {
        return {
          success: true,
          orderNumber: existing.orderNumber,
          publicToken: existing.publicToken,
          confirmationUrl: `/order/${existing.orderNumber}?token=${encodeURIComponent(
            existing.publicToken,
          )}&placed=1`,
        };
      }
    }

    const settings = await getPublicSettings();
    if (!settings.acceptingOrders) {
      return {
        success: false,
        message:
          "Online ordering is paused right now. Please call us to place an order.",
      };
    }

    if (details.paymentMethod === "COD" && !settings.codEnabled) {
      return { success: false, message: "Cash on delivery is unavailable." };
    }
    if (details.paymentMethod === "ESEWA" && !settings.esewaEnabled) {
      return { success: false, message: "eSewa is unavailable right now." };
    }
    if (details.paymentMethod === "KHALTI" && !settings.khaltiEnabled) {
      return { success: false, message: "Khalti is unavailable right now." };
    }

    const paymentAvailability = onlinePaymentAvailability();
    if (details.paymentMethod === "ESEWA" && !paymentAvailability.esewa) {
      return {
        success: false,
        message:
          "eSewa is not configured correctly. Please choose cash or contact us.",
      };
    }
    if (details.paymentMethod === "KHALTI" && !paymentAvailability.khalti) {
      return {
        success: false,
        message:
          "Khalti is not configured correctly. Please choose cash or contact us.",
      };
    }

    const dishIds = [...new Set(items.map((item) => item.dishId))];
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      include: {
        variants: true,
        addOns: { include: { addOn: true } },
      },
    });
    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));

    const orderItems: Array<{
      dishId: string;
      name: string;
      variantName: string | null;
      addOns: string;
      instructions: string | null;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const dish = dishMap.get(item.dishId);
      if (!dish || !dish.isAvailable) {
        return {
          success: false,
          message:
            "One of the dishes in your cart is unavailable. Please refresh the menu.",
        };
      }

      let unitPrice = dish.price;
      let variantName: string | null = null;
      if (item.variantId) {
        const variant = dish.variants.find(
          (option) => option.id === item.variantId && option.isAvailable,
        );
        if (!variant) {
          return {
            success: false,
            message: `The selected option for ${dish.name} is unavailable.`,
          };
        }
        unitPrice += variant.priceDelta;
        variantName = variant.name;
      }

      const validAddOnIds = new Set(dish.addOns.map(({ addOn }) => addOn.id));
      const selectedAddOns = item.addOnIds.map((id) => {
        if (!validAddOnIds.has(id)) return null;
        return dish.addOns.find(({ addOn }) => addOn.id === id)?.addOn ?? null;
      });
      if (selectedAddOns.some((addOn) => addOn === null || !addOn.isActive)) {
        return {
          success: false,
          message: `One of the extras for ${dish.name} is unavailable.`,
        };
      }
      const addOns = selectedAddOns.filter(
        (addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn),
      );
      unitPrice += addOns.reduce((sum, addOn) => sum + addOn.price, 0);

      const quantity = Math.min(20, Math.max(1, item.quantity));
      orderItems.push({
        dishId: dish.id,
        name: dish.name,
        variantName,
        addOns: JSON.stringify(
          addOns.map(({ id, name, price }) => ({ id, name, price })),
        ),
        instructions: item.instructions || null,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

    let deliveryFee = 0;
    let zoneId: string | null = null;
    let deliveryAddress: string | null = null;

    if (details.type === "DELIVERY") {
      const zone = details.zoneId
        ? await prisma.deliveryZone.findFirst({
            where: { id: details.zoneId, isActive: true },
          })
        : null;
      if (!zone) {
        return {
          success: false,
          message: "Choose a valid delivery area.",
        };
      }
      if (subtotal < Math.max(settings.minDeliveryOrder, zone.minOrder)) {
        return {
          success: false,
          message: `Delivery in ${zone.name} starts at ${formatNPR(
            Math.max(settings.minDeliveryOrder, zone.minOrder),
          )}.`,
        };
      }
      deliveryFee = zone.fee;
      zoneId = zone.id;
      deliveryAddress = [
        details.line1,
        details.line2,
        details.city,
        details.state,
        "Nepal",
      ]
        .filter(Boolean)
        .join(", ");
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountAmount = 0;
    let selectedCoupon: {
      id: string;
      maxUses: number | null;
      startsAt: Date | null;
      expiresAt: Date | null;
    } | null = null;
    if (details.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: details.couponCode.trim().toUpperCase() },
      });
      if (!coupon) {
        return { success: false, message: "That coupon code is not valid." };
      }
      const discount = calculateCouponDiscount(coupon, subtotal);
      if (!discount.valid) {
        return {
          success: false,
          message: `${discount.reason} Remove the coupon and try again.`,
        };
      }
      selectedCoupon = {
        id: coupon.id,
        maxUses: coupon.maxUses,
        startsAt: coupon.startsAt,
        expiresAt: coupon.expiresAt,
      };
      couponId = coupon.id;
      couponCode = coupon.code;
      discountAmount = discount.discount;
    }

    let scheduledFor: Date | null = null;
    if (details.scheduledFor) {
      const parsedDate = parseNepalDateTime(details.scheduledFor);
      if (!parsedDate) {
        return { success: false, message: "Choose a valid order time." };
      }
      const minTime = Date.now() + 10 * 60 * 1000;
      const maxTime = Date.now() + 14 * 24 * 60 * 60 * 1000;
      if (parsedDate.getTime() < minTime) {
        return {
          success: false,
          message: "Scheduled orders need at least 10 minutes' notice.",
        };
      }
      if (parsedDate.getTime() > maxTime) {
        return {
          success: false,
          message: "We accept scheduled orders up to 14 days ahead.",
        };
      }
      scheduledFor = parsedDate;
    }

    const totals = calculateOrderTotals({
      subtotal,
      deliveryFee,
      discountAmount,
      taxRate: settings.taxRate,
      serviceChargeRate: settings.serviceChargeRate,
    });

    const user = await getCurrentUser();
    let addressId: string | null = null;
    if (user && details.type === "DELIVERY" && details.saveAddress) {
      const address = await prisma.address.create({
        data: {
          userId: user.id,
          label: "Delivery",
          fullName: details.customerName,
          phone: details.customerPhone,
          line1: details.line1 ?? "",
          line2: details.line2 || null,
          city: details.city || "Biratnagar",
          state: details.state || "Koshi",
          country: "Nepal",
        },
      });
      addressId = address.id;
    }

    const publicToken = generateSecureToken(24);
    const orderNumber = generateOrderNumber();
    const digitalPayment = details.paymentMethod !== "COD";

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          publicToken,
          userId: user?.id,
          idempotencyKey: idempotencyKey ?? null,
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone,
          type: details.type,
          status: "PENDING",
          paymentStatus: digitalPayment ? "INITIATED" : "UNPAID",
          paymentMethod: details.paymentMethod,
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          total: totals.total,
          couponId,
          couponCode,
          addressId,
          zoneId,
          deliveryAddress,
          tableNumber: details.tableNumber || null,
          notes: details.notes || null,
          scheduledFor,
          items: {
            create: orderItems.map((item) => ({
              dishId: item.dishId,
              name: item.name,
              variantName: item.variantName,
              addOns: item.addOns,
              instructions: item.instructions,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              status: "PENDING",
              note: "Order placed from the website.",
              changedBy: user?.email ?? details.customerEmail,
            },
          },
          payments: {
            create: {
              provider: details.paymentMethod,
              amount: totals.total,
              status: details.paymentMethod === "COD" ? "PENDING" : "INITIATED",
            },
          },
        },
        include: { items: true },
      });

      if (selectedCoupon) {
        const now = new Date();
        // Claim the coupon inside the order transaction. The conditional
        // update prevents two concurrent checkouts from exceeding maxUses or
        // using a coupon that expired/was disabled after the initial check.
        const claimed = await tx.coupon.updateMany({
          where: {
            id: selectedCoupon.id,
            isActive: true,
            ...(selectedCoupon.maxUses !== null
              ? { usedCount: { lt: selectedCoupon.maxUses } }
              : {}),
            ...(selectedCoupon.startsAt
              ? { startsAt: { lte: now } }
              : {}),
            ...(selectedCoupon.expiresAt
              ? { expiresAt: { gt: now } }
              : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new CouponUnavailableError();
      }

      const payment = paymentPresentation(
        created.paymentMethod,
        created.paymentStatus,
      );
      await createStaffNotification(tx, {
        eventKey: `order:${created.id}:created`,
        type: "ORDER",
        title: `New order ${created.orderNumber} — ${payment.label}`,
        message: `${ORDER_TYPE_LABELS[created.type as keyof typeof ORDER_TYPE_LABELS] ?? created.type} · ${formatNPR(created.total)} · ${payment.label}`,
        link: `/admin/orders/${created.id}`,
        orderId: created.id,
        isTest: created.isTest,
      });

      return created;
    });

    const confirmationUrl = `/order/${order.orderNumber}?token=${encodeURIComponent(
      publicToken,
    )}&placed=1`;

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
        `New order ${order.orderNumber} — ${formatNPR(order.total)}`,
        `<p style="font-size:14px;line-height:1.8;"><strong>${escapeHtml(
          order.customerName,
        )}</strong> · ${escapeHtml(order.customerPhone)} · ${escapeHtml(
          order.customerEmail,
        )}</p>
        <p style="font-size:14px;line-height:1.8;">${escapeHtml(
          order.type.replace("_", " "),
        )} · ${escapeHtml(order.paymentMethod)} · ${order.items.length} lines</p>
        <p style="font-size:14px;line-height:1.8;">${escapeHtml(
          order.deliveryAddress ?? details.tableNumber ?? "Pickup",
        )}</p>
        <p style="font-size:14px;line-height:1.8;">${escapeHtml(
          order.notes ?? "",
        )}</p>`,
      ).catch((error) => console.error("Admin order email failed", error));

      await writeAuditLog({
        userId: user?.id,
        actorEmail: user?.email ?? order.customerEmail,
        action: "order.create",
        entity: "Order",
        entityId: order.id,
        details: {
          orderNumber: order.orderNumber,
          total: order.total,
          type: order.type,
          paymentMethod: order.paymentMethod,
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    return {
      success: true,
      orderNumber: order.orderNumber,
      publicToken,
      confirmationUrl,
    };
  } catch (error) {
    if (error instanceof CouponUnavailableError) {
      return {
        success: false,
        message: "That coupon is no longer available. Remove it and try again.",
      };
    }
    if (input.idempotencyKey && isUniqueConstraintError(error)) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { orderNumber: true, publicToken: true },
      });
      if (existing) {
        return {
          success: true,
          orderNumber: existing.orderNumber,
          publicToken: existing.publicToken,
          confirmationUrl: `/order/${existing.orderNumber}?token=${encodeURIComponent(
            existing.publicToken,
          )}&placed=1`,
        };
      }
    }
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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          ...(user ? [{ userId: user.id }] : []),
          ...(token ? [{ publicToken: token }] : []),
        ],
      },
      include: { items: true },
    });
    if (!order) return { success: false, message: "Order not found." };
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return {
        success: false,
        message:
          "This order is already being prepared. Please call us for help.",
      };
    }

    const refundRequired = order.paymentStatus === "PAID";
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason.slice(0, 300),
          // A customer cancellation never records a refund. The funds remain
          // PAID until an admin completes and records the refund.
        },
      });
      if (changed.count !== 1) return false;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: `${reason.slice(0, 300) || "Cancelled by customer."}${
            refundRequired ? " Refund required." : ""
          }`,
          changedBy: user?.email ?? order.customerEmail,
        },
      });

      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:status:${order.status}:CANCELLED`,
        type: "ORDER",
        title: `Order ${order.orderNumber} cancelled by customer`,
        message: `${ORDER_TYPE_LABELS[order.type as keyof typeof ORDER_TYPE_LABELS] ?? order.type} · ${formatNPR(order.total)}${refundRequired ? " · refund required" : ""}`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });

      return true;
    });

    if (!updated) {
      return {
        success: false,
        message:
          "This order has already moved forward. Please refresh and call us if you still need to cancel.",
      };
    }

    await writeAuditLog({
      userId: user?.id,
      actorEmail: user?.email ?? order.customerEmail,
      action: "order.cancel.customer",
      entity: "Order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        reason,
        ...(refundRequired ? { refundRequired: true } : {}),
      },
    });

    after(async () => {
      await sendAdminNotification(
        `Order ${order.orderNumber} cancelled by customer`,
        `<p style="font-size:14px;">Reason: ${escapeHtml(reason || "Not given")}</p><p style="font-size:14px;">A paid order may need a manual refund.</p>`,
      ).catch(() => undefined);
    });

    revalidatePath("/account/orders");
    revalidatePath(`/order/${order.orderNumber}`);
    return {
      success: true,
      message:
        order.paymentStatus === "PAID"
          ? "Order cancelled. Our team will contact you about the refund."
          : "Order cancelled. We hope to see you another time.",
    };
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
    const storedPhone = order?.customerPhone.replace(/\D/g, "").slice(-10) ?? "";
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
  if (getPaymentMode() !== "mock" || !isTestPaymentModeAllowed()) {
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
