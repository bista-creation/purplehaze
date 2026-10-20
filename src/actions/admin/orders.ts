"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  adminActionUser,
  actionErrorMessage,
  auditAction,
  refreshAdmin,
  staffActionUser,
} from "@/lib/admin";
import {
  acceptOrderSchema,
  orderStatusSchema,
  type AcceptOrderInput,
  type OrderStatusInput,
} from "@/lib/validations";
import {
  ORDER_STATUS_FLOW,
  ORDER_TYPE_LABELS,
  STATUS_META,
  type OrderStatus,
} from "@/lib/constants";
import { sendOrderStatusEmail } from "@/lib/email";
import { formatNPR } from "@/lib/money";
import { createStaffNotification } from "@/lib/notifications";
import {
  evaluateOrderAcceptance,
  paymentPresentation,
} from "@/lib/order-state";

export type AdminActionResult = { success: boolean; message: string };

export async function acceptOrderAction(
  input: AcceptOrderInput,
): Promise<AdminActionResult> {
  const parsed = acceptOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Choose a valid order.",
    };
  }

  try {
    const user = await staffActionUser();
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
    });
    if (!order) return { success: false, message: "Order not found." };

    const decision = evaluateOrderAcceptance(order);
    if (!decision.allowed) {
      return { success: false, message: decision.reason };
    }

    const payment = decision.payment;
    const note =
      parsed.data.note?.trim() ||
      `Order accepted. ${payment.label}. ${payment.detail}`;
    const acceptedAt = new Date();

    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
          ...(payment.isPaid
            ? { paymentStatus: "PAID" }
            : {
                paymentMethod: "COD",
                // Require the exact payment state that was reviewed. If cash
                // was just recorded, accept only after the refreshed view.
                paymentStatus: order.paymentStatus,
              }),
        },
        data: {
          status: "CONFIRMED",
          acceptedAt,
          acceptedBy: user.email,
        },
      });
      if (updated.count !== 1) return false;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CONFIRMED",
          note,
          changedBy: user.email,
        },
      });

      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:accepted`,
        type: "ORDER",
        title: `Order ${order.orderNumber} accepted`,
        message: `${ORDER_TYPE_LABELS[order.type as keyof typeof ORDER_TYPE_LABELS] ?? order.type} · ${payment.label} · ${user.name ?? user.email}`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });

      return true;
    });

    if (!changed) {
      return {
        success: false,
        message:
          "This order changed while you were reviewing it. Refresh and try again.",
      };
    }

    await auditAction(user, "order.accept", "Order", order.id, {
      from: "PENDING",
      to: "CONFIRMED",
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      note,
    });

    after(async () => {
      await sendOrderStatusEmail(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: "CONFIRMED",
          total: order.total,
        },
        note,
      ).catch(() => undefined);
    });

    refreshAdmin(`/admin/orders/${order.id}`, "/admin/orders");
    revalidateOrderLinks(order);
    return {
      success: true,
      message: "Order accepted and sent to the kitchen.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't accept that order."),
    };
  }
}

export async function updateOrderStatusAction(
  input: OrderStatusInput,
): Promise<AdminActionResult> {
  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Choose a valid status.",
    };
  }

  try {
    const user = await staffActionUser();
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
    });
    if (!order) return { success: false, message: "Order not found." };
    const current = order.status as OrderStatus;
    const next = parsed.data.status as OrderStatus;

    if (current === next) {
      return { success: true, message: "That status is already set." };
    }
    if (current === "PENDING" && next === "CONFIRMED") {
      return {
        success: false,
        message:
          "Use the explicit Accept order action so the order and payment state are reviewed together.",
      };
    }

    const allowed = ORDER_STATUS_FLOW[current] ?? [];
    if (!allowed.includes(next)) {
      return {
        success: false,
        message: `Cannot move an order from ${STATUS_META[current]?.label ?? current} to ${STATUS_META[next].label}.`,
      };
    }

    const note =
      parsed.data.note?.trim() ||
      (next === "CANCELLED"
        ? "Cancelled by the restaurant team."
        : STATUS_META[next].description);
    const markingCancelled = next === "CANCELLED";
    const refundRequired = markingCancelled && order.paymentStatus === "PAID";
    const payment = paymentPresentation(
      order.paymentMethod,
      order.paymentStatus,
    );

    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: current },
        data: {
          status: next,
          ...(markingCancelled
            ? { cancelledAt: new Date(), cancelReason: note.slice(0, 300) }
            : {}),
          // Refunds are recorded only by the explicit admin refund action
          // after the provider/counter refund has actually been completed.
        },
      });
      if (updated.count !== 1) return false;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: next,
          note: refundRequired ? `${note} Refund required.` : note,
          changedBy: user.email,
        },
      });

      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:status:${current}:${next}`,
        type: "ORDER",
        title: `Order ${order.orderNumber} — ${STATUS_META[next].label}`,
        message: `${ORDER_TYPE_LABELS[order.type as keyof typeof ORDER_TYPE_LABELS] ?? order.type} · ${payment.label}${refundRequired ? " · refund required" : ""}`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });

      return true;
    });

    if (!changed) {
      return {
        success: false,
        message:
          "This order changed while you were updating it. Refresh and check the current state before retrying.",
      };
    }

    await auditAction(user, "order.status.change", "Order", order.id, {
      from: current,
      to: next,
      previous: current,
      next,
      note,
      ...(refundRequired ? { refundRequired: true } : {}),
    });

    after(async () => {
      await sendOrderStatusEmail(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: next,
          total: order.total,
        },
        refundRequired
          ? `${note} Your payment will be refunded manually.`
          : note,
      ).catch(() => undefined);
    });

    refreshAdmin(`/admin/orders/${order.id}`, "/admin/orders");
    revalidateOrderLinks(order);
    return {
      success: true,
      message: `Order marked ${STATUS_META[next].label.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update that order."),
    };
  }
}

/**
 * Declining is a deliberate action with its own audit record. It never accepts
 * an order. A paid declined order stays PAID until an ADMIN records the refund
 * after completing the actual provider/counter refund.
 */
export async function declineOrderAction(
  orderId: string,
  reason = "Declined by the restaurant team.",
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: "Order not found." };
    if (order.status !== "PENDING") {
      return {
        success: false,
        message:
          "Only a pending order can be declined. Refresh to see its current state.",
      };
    }

    const note =
      reason.trim().slice(0, 300) || "Declined by the restaurant team.";
    const refundRequired = order.paymentStatus === "PAID";
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: note,
          // Keep the payment PAID until an admin records the completed refund.
        },
      });
      if (updated.count !== 1) return false;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: refundRequired ? `${note} Refund required.` : note,
          changedBy: user.email,
        },
      });
      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:declined`,
        type: "ORDER",
        title: `Order ${order.orderNumber} declined`,
        message: `${ORDER_TYPE_LABELS[order.type as keyof typeof ORDER_TYPE_LABELS] ?? order.type} · ${formatNPR(order.total)}${refundRequired ? " · refund required" : ""}`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });
      return true;
    });

    if (!changed) {
      return {
        success: false,
        message:
          "This order changed before it could be declined. Refresh and check the current state.",
      };
    }

    await auditAction(user, "order.decline", "Order", order.id, {
      from: "PENDING",
      to: "CANCELLED",
      previous: "PENDING",
      next: "CANCELLED",
      note,
      paymentStatus: order.paymentStatus,
      ...(refundRequired ? { refundRequired: true } : {}),
    });

    after(async () => {
      await sendOrderStatusEmail(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: "CANCELLED",
          total: order.total,
        },
        refundRequired
          ? `${note} Your payment will be refunded manually.`
          : note,
      ).catch(() => undefined);
    });

    refreshAdmin(`/admin/orders/${order.id}`, "/admin/orders");
    revalidateOrderLinks(order);
    return { success: true, message: "Order declined and cancelled." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't decline that order."),
    };
  }
}

/**
 * Manual payment collection is only valid for cash orders. Online payments
 * must be verified by the provider callback/lookup path.
 */
export async function markOrderPaidAction(
  orderId: string,
  note = "Cash payment collected by the restaurant team.",
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: "Order not found." };
    if (order.paymentMethod !== "COD") {
      return {
        success: false,
        message:
          "Online payments are verified by eSewa/Khalti. Ask the customer to recheck the payment instead of marking it paid manually.",
      };
    }
    if (order.paymentStatus === "PAID") {
      return { success: true, message: "This order is already paid." };
    }
    if (order.status === "CANCELLED") {
      return {
        success: false,
        message: "A cancelled order cannot be marked paid.",
      };
    }

    const paymentNote = note.trim() || "Cash payment collected.";
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentMethod: "COD",
          paymentStatus: { not: "PAID" },
          status: { not: "CANCELLED" },
        },
        data: { paymentStatus: "PAID" },
      });
      if (updated.count !== 1) return false;

      const existing = await tx.payment.findFirst({
        where: { orderId: order.id, provider: "COD" },
        orderBy: { createdAt: "desc" },
      });
      const transactionId = existing?.transactionId ?? `MANUAL-${randomUUID()}`;
      if (existing) {
        await tx.payment.update({
          where: { id: existing.id },
          data: {
            status: "PAID",
            transactionId,
            amount: order.total,
            payload: JSON.stringify({ manual: true, note: paymentNote }),
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "COD",
            amount: order.total,
            status: "PAID",
            transactionId,
            payload: JSON.stringify({ manual: true, note: paymentNote }),
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: paymentNote,
          changedBy: user.email,
        },
      });

      await createStaffNotification(tx, {
        eventKey: `payment:${order.id}:cod-collected`,
        type: "PAYMENT",
        title: `Cash received for ${order.orderNumber}`,
        message: `Cash on delivery · ${formatNPR(order.total)}`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });

      return true;
    });

    if (!changed) {
      return {
        success: false,
        message:
          "This payment changed before it could be recorded. Refresh and check the current payment state.",
      };
    }

    await auditAction(user, "order.payment.cod_collected", "Order", order.id, {
      note: paymentNote,
      paymentStatus: "PAID",
      paymentMethod: "COD",
    });
    refreshAdmin(`/admin/orders/${order.id}`, "/admin/orders");
    revalidateOrderLinks(order);
    return { success: true, message: "Cash payment marked as received." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the payment."),
    };
  }
}

export async function markOrderRefundedAction(
  orderId: string,
  note = "Manual refund completed.",
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: "Order not found." };
    if (order.paymentStatus !== "PAID") {
      return { success: false, message: "Only a paid order can be refunded." };
    }
    if (order.status !== "CANCELLED") {
      return {
        success: false,
        message: "Cancel the order before recording a refund.",
      };
    }

    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: "PAID" },
        data: { paymentStatus: "REFUNDED" },
      });
      if (updated.count !== 1) return false;

      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PAID" },
        // Keep the original provider payload/transaction data intact. The
        // refund note lives in the status history and audit log.
        data: { status: "REFUNDED" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `Refund recorded manually: ${note}`,
          changedBy: user.email,
        },
      });
      return true;
    });

    if (!changed) {
      return {
        success: false,
        message: "The payment changed before the refund was recorded.",
      };
    }

    await auditAction(user, "order.payment.refund", "Order", order.id, {
      note,
      previous: "PAID",
      next: "REFUNDED",
    });
    refreshAdmin(`/admin/orders/${order.id}`, "/admin/orders");
    revalidateOrderLinks(order);
    return {
      success: true,
      message: "Refund recorded after manual completion.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't record the refund."),
    };
  }
}

function revalidateOrderLinks(order: {
  orderNumber: string;
  userId: string | null;
}) {
  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/account/orders");
  if (order.userId) revalidatePath("/account");
}
