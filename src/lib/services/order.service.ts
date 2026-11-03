import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cartService } from "./cart.service";
import { getPublicSettings } from "@/lib/settings";
import {
  calculateCouponDiscount,
  calculateOrderTotals,
  formatNPR,
} from "@/lib/money";
import {
  onlinePaymentAvailability,
} from "@/lib/payments";
import { parseNepalDateTime } from "@/lib/time";
import { generateOrderNumber, parseAddOnNames } from "@/lib/utils";
import { generateSecureToken } from "@/lib/security";
import {
  escapeHtml,
  sendAdminNotification,
  sendOrderConfirmation,
  sendOrderStatusEmail,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { createStaffNotification } from "@/lib/notifications";
import {
  CUSTOMER_CANCELLABLE,
  ORDER_STATUS_FLOW,
  ORDER_TYPE_LABELS,
  type OrderStatus,
  type OrderType,
} from "@/lib/constants";
import { evaluateOrderAcceptance, paymentPresentation } from "@/lib/order-state";
import { broadcastOrderCreated, broadcastOrderStatusUpdated } from "@/lib/realtime/broadcast";
import { pushNotificationService } from "./push-notification.service";
import type { CreateOrderInput } from "@/lib/validations";

export class CouponUnavailableError extends Error {
  constructor() {
    super("Coupon is no longer available.");
    this.name = "CouponUnavailableError";
  }
}

export type OrderCreationResult =
  | {
      success: true;
      orderId: string;
      orderNumber: string;
      publicToken: string;
      confirmationUrl: string;
      paymentMethod: string;
      digitalPayment: boolean;
      total: number;
    }
  | {
      success: false;
      message: string;
    };

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002",
  );
}

export class OrderService {
  async createOrder(
    input: CreateOrderInput,
    user?: { id: string; email: string; isTest?: boolean } | null,
  ): Promise<OrderCreationResult> {
    const { details, items, idempotencyKey } = input;

    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: {
          id: true,
          orderNumber: true,
          publicToken: true,
          paymentMethod: true,
          total: true,
        },
      });
      if (existing) {
        return {
          success: true,
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          publicToken: existing.publicToken,
          confirmationUrl: `/order/${existing.orderNumber}?token=${encodeURIComponent(
            existing.publicToken,
          )}&placed=1`,
          paymentMethod: existing.paymentMethod,
          digitalPayment: existing.paymentMethod !== "COD",
          total: existing.total,
        };
      }
    }

    // 2. Settings check
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

    // 3. Validate Cart & Server Prices
    const cartCalc = await cartService.validateAndCalculateItems(items);
    if (!cartCalc.valid) {
      return { success: false, message: cartCalc.message };
    }

    const subtotal = cartCalc.subtotal;

    // 4. Delivery zone & fee
    let deliveryFee = 0;
    let zoneId: string | null = null;
    let deliveryAddress: string | null = null;

    if (details.type === "DELIVERY") {
      let zone: { id: string; name: string; fee: number; minOrder: number; sortOrder: number; isActive: boolean } | null = details.zoneId
        ? await prisma.deliveryZone.findFirst({
            where: { id: details.zoneId, isActive: true },
          })
        : null;
      if (!zone) {
        zone = await prisma.deliveryZone.findFirst({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        });
      }
      if (!zone) {
        zone = {
          id: "default-biratnagar",
          name: "Biratnagar City",
          fee: 3000,
          minOrder: settings.minDeliveryOrder || 25000,
          sortOrder: 1,
          isActive: true,
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

    // 5. Coupon validation
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

    // 6. Scheduled delivery
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

    // 7. Calculate final totals
    const totals = calculateOrderTotals({
      subtotal,
      deliveryFee,
      discountAmount,
      taxRate: settings.taxRate,
      serviceChargeRate: settings.serviceChargeRate,
    });

    // 8. Save user address if requested
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

    try {
      // 9. Database transaction
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
            isTest: user?.isTest ?? false,
            items: {
              create: cartCalc.items.map((item) => ({
                dishId: item.dishId,
                name: item.name,
                variantName: item.variantName,
                addOns: JSON.stringify(item.addOns),
                instructions: item.instructions,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                lineTotal: item.lineTotal,
              })),
            },
            statusHistory: {
              create: {
                status: "PENDING",
                note: "Order placed.",
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
          const claimed = await tx.coupon.updateMany({
            where: {
              id: selectedCoupon.id,
              isActive: true,
              ...(selectedCoupon.maxUses !== null
                ? { usedCount: { lt: selectedCoupon.maxUses } }
                : {}),
              ...(selectedCoupon.startsAt ? { startsAt: { lte: now } } : {}),
              ...(selectedCoupon.expiresAt ? { expiresAt: { gt: now } } : {}),
            },
            data: { usedCount: { increment: 1 } },
          });
          if (claimed.count !== 1) throw new CouponUnavailableError();
        }

        const payment = paymentPresentation(
          created.paymentMethod,
          created.paymentStatus,
        );
        if (!digitalPayment) {
          await createStaffNotification(tx, {
            eventKey: `order:${created.id}:created`,
            type: "ORDER",
            title: `New order ${created.orderNumber} — ${payment.label}`,
            message: `${ORDER_TYPE_LABELS[created.type as keyof typeof ORDER_TYPE_LABELS] ?? created.type} · ${formatNPR(created.total)} · ${payment.label}`,
            link: `/admin/orders/${created.id}`,
            orderId: created.id,
            isTest: created.isTest,
          });
        }

        return created;
      }, { timeout: 30000, maxWait: 15000 });

      const confirmationUrl = `/order/${order.orderNumber}?token=${encodeURIComponent(
        publicToken,
      )}&placed=1`;

      if (!digitalPayment) {
        sendOrderConfirmation({
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
        }).catch((err) => console.error("Order confirmation email failed", err));

        sendAdminNotification(
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
        ).catch((err) => console.error("Admin order email failed", err));
      }

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

      broadcastOrderCreated({
        id: order.id,
        orderNumber: order.orderNumber,
        userId: user?.id,
        createdAt: order.createdAt,
      }).catch((err) => console.warn("Realtime order created broadcast failed:", err));

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        publicToken,
        confirmationUrl,
        paymentMethod: order.paymentMethod,
        digitalPayment,
        total: order.total,
      };
    } catch (error) {
      if (error instanceof CouponUnavailableError) {
        return {
          success: false,
          message: "That coupon is no longer available. Remove it and try again.",
        };
      }
      if (idempotencyKey && isUniqueConstraintError(error)) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
          select: {
            id: true,
            orderNumber: true,
            publicToken: true,
            paymentMethod: true,
            total: true,
          },
        });
        if (existing) {
          return {
            success: true,
            orderId: existing.id,
            orderNumber: existing.orderNumber,
            publicToken: existing.publicToken,
            confirmationUrl: `/order/${existing.orderNumber}?token=${encodeURIComponent(
              existing.publicToken,
            )}&placed=1`,
            paymentMethod: existing.paymentMethod,
            digitalPayment: existing.paymentMethod !== "COD",
            total: existing.total,
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

  async getOrderById(orderId: string, userId?: string | null) {
    const where: Prisma.OrderWhereInput = {
      id: orderId,
    };
    if (userId) where.userId = userId;

    return prisma.order.findFirst({
      where,
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        payments: true,
        address: true,
        zone: true,
        delivery: true,
      },
    });
  }

  async getOrderByNumber(
    orderNumber: string,
    userId?: string | null,
    publicToken?: string | null,
  ) {
    const where: Prisma.OrderWhereInput = {
      orderNumber,
    };
    if (userId) {
      where.userId = userId;
    } else if (publicToken) {
      where.publicToken = publicToken;
    }

    return prisma.order.findFirst({
      where,
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        payments: true,
        zone: true,
        delivery: true,
      },
    });
  }

  async trackOrder(orderNumber: string, phone: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const order = await prisma.order.findFirst({
      where: { orderNumber: orderNumber.trim().toUpperCase() },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) return null;
    const storedPhone = order.customerPhone.replace(/\D/g, "").slice(-10);
    const providedPhone = cleanPhone.slice(-10);
    const matches =
      storedPhone.length >= 7 &&
      providedPhone.length >= 7 &&
      storedPhone === providedPhone;

    if (!matches) return null;

    return order;
  }

  async listOrders(filters?: {
    userId?: string;
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.OrderWhereInput = {
      isTest: false,
    };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;

    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: s, mode: "insensitive" } },
        { customerName: { contains: s, mode: "insensitive" } },
        { customerPhone: { contains: s } },
      ];
    }

    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    note?: string | null,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, delivery: true },
    });
    if (!order) {
      return { success: false, message: "Order not found." };
    }

    const currentStatus = order.status as OrderStatus;
    if (currentStatus === newStatus) {
      return { success: true, message: `Order is already ${newStatus.toLowerCase()}.` };
    }

    // 1. Enforce ORDER_STATUS_FLOW
    const allowedNext = ORDER_STATUS_FLOW[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return {
        success: false,
        message: `Cannot transition order status from ${currentStatus} to ${newStatus}.`,
      };
    }

    // 2. Acceptance & Payment checks when moving from PENDING to CONFIRMED
    if (newStatus === "CONFIRMED") {
      const decision = evaluateOrderAcceptance(order);
      if (!decision.allowed) {
        return { success: false, message: decision.reason };
      }
    }

    // 3. For own-rider delivery orders, block direct manual transition to OUT_FOR_DELIVERY or COMPLETED
    if (order.type === "DELIVERY" && (order.deliveryProvider === "OWN_RIDER" || order.delivery)) {
      if (newStatus === "OUT_FOR_DELIVERY") {
        return {
          success: false,
          message:
            "Delivery orders automatically move to 'On the way' when the assigned rider picks up the order at the kitchen.",
        };
      }
      if (newStatus === "COMPLETED") {
        return {
          success: false,
          message:
            "Delivery orders must be completed via rider OTP verification at the customer location (or via Dispatch Board override).",
        };
      }
    }

    const transitionNote =
      note?.trim() || `Status updated from ${currentStatus} to ${newStatus}.`;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id: order.id, status: currentStatus },
        data: {
          status: newStatus,
          ...(newStatus === "CONFIRMED"
            ? { acceptedAt: new Date(), acceptedBy: changedBy }
            : {}),
        },
      });

      if (res.count !== 1) {
        throw new Error("Order was updated concurrently. Please refresh.");
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: newStatus,
          note: transitionNote,
          changedBy,
        },
      });

      if (order.delivery) {
        if (newStatus === "COMPLETED" && order.delivery.status !== "DELIVERED") {
          await tx.delivery.update({
            where: { id: order.delivery.id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
              otpVerifiedAt: new Date(),
            },
          });
        } else if (newStatus === "CANCELLED" && order.delivery.status !== "FAILED" && order.delivery.status !== "DELIVERED") {
          await tx.delivery.update({
            where: { id: order.delivery.id },
            data: {
              status: "FAILED",
              failureReason: "ORDER_CANCELLED",
              failedAt: new Date(),
            },
          });
        }
      }

      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:${newStatus.toLowerCase()}`,
        type: "ORDER",
        title: `Order ${order.orderNumber} ${newStatus.toLowerCase()}`,
        message: `${ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type} · ${changedBy}`,
        link: `/admin/orders?highlight=${order.id}`,
        orderId: order.id,
      });

      return tx.order.findUnique({ where: { id: order.id } });
    }, { timeout: 30000, maxWait: 15000 });

    if (updated) {
      sendOrderStatusEmail(
        {
          orderNumber: updated.orderNumber,
          customerName: updated.customerName,
          customerEmail: updated.customerEmail,
          status: newStatus,
          total: updated.total,
        },
        note || undefined,
      ).catch(() => undefined);

      await writeAuditLog({
        actorEmail: changedBy,
        action: "order.status_change",
        entity: "Order",
        entityId: order.id,
        details: JSON.stringify({ from: currentStatus, to: newStatus }),
      });

      broadcastOrderStatusUpdated({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: newStatus,
        userId: updated.userId,
      }).catch((err) => console.warn("Realtime order status broadcast failed:", err));

      pushNotificationService
        .sendOrderStatusNotification({
          userId: updated.userId,
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: newStatus,
          note,
        })
        .catch((err) => console.warn("Push notification failed:", err));
    }

    return {
      success: true,
      message: `Order updated to ${newStatus.toLowerCase()}.`,
      order: updated,
    };
  }

  async cancelOrder(
    orderId: string,
    reason?: string | null,
    userId?: string | null,
    publicToken?: string | null,
    isStaff = false,
  ) {
    const where: Prisma.OrderWhereInput = {
      id: orderId,
    };

    if (!isStaff) {
      if (userId && publicToken) {
        where.OR = [{ userId }, { publicToken }];
      } else if (userId) {
        where.userId = userId;
      } else if (publicToken) {
        where.publicToken = publicToken;
      } else {
        return { success: false, message: "Order not found." };
      }
    }

    const order = await prisma.order.findFirst({ where });
    if (!order) return { success: false, message: "Order not found." };

    if (!isStaff && !CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus)) {
      return {
        success: false,
        message:
          "This order is already being prepared or is out for delivery. Please call us for help.",
      };
    }

    if (order.status === "CANCELLED") {
      return { success: true, message: "Order is already cancelled." };
    }

    const cancelReason = (reason?.trim() || "Customer requested cancellation.").slice(
      0,
      300,
    );
    const refundRequired = order.paymentStatus === "PAID";

    await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: isStaff ? [order.status] : ["PENDING", "CONFIRMED"] },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason,
        },
      });

      if (res.count !== 1) {
        throw new Error("Order was changed concurrently.");
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: cancelReason,
          changedBy: isStaff ? "Staff" : order.customerEmail,
        },
      });

      await createStaffNotification(tx, {
        eventKey: `order:${order.id}:cancelled`,
        type: "ORDER",
        title: `Order ${order.orderNumber} cancelled${
          refundRequired ? " — refund required" : ""
        }`,
        message: cancelReason,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        isTest: order.isTest,
      });
    }, { timeout: 30000, maxWait: 15000 });

    sendOrderStatusEmail(
      {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: "CANCELLED",
        total: order.total,
      },
      cancelReason,
    ).catch(() => undefined);

    await writeAuditLog({
      userId: userId || undefined,
      actorEmail: isStaff ? "Staff" : order.customerEmail,
      action: "order.cancel",
      entity: "Order",
      entityId: order.id,
      details: cancelReason,
    });

    broadcastOrderStatusUpdated({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "CANCELLED",
      userId: order.userId,
    }).catch((err) => console.warn("Realtime order cancel broadcast failed:", err));

    pushNotificationService
      .sendOrderStatusNotification({
        userId: order.userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "CANCELLED",
        note: cancelReason,
      })
      .catch((err) => console.warn("Push notification failed:", err));

    return {
      success: true,
      message: refundRequired
        ? "Order cancelled. Since this order was paid online, our team will process your refund manually."
        : "Your order has been cancelled.",
    };
  }

  async getReorderLines(
    orderId: string,
    userId: string,
  ): Promise<
    | {
        success: true;
        lines: Array<{
          dishId: string;
          name: string;
          slug: string;
          image: string | null;
          categoryName: string;
          basePrice: number;
          variantId: string | null;
          variantName: string | null;
          variantPrice: number;
          addOns: Array<{ id: string; name: string; price: number }>;
          quantity: number;
          instructions?: string;
        }>;
        skipped: number;
      }
    | { success: false; message: string }
  > {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            dish: {
              include: {
                category: true,
                variants: { where: { isAvailable: true } },
                addOns: { include: { addOn: true } },
              },
            },
          },
        },
      },
    });

    if (!order) return { success: false, message: "Order not found." };

    const lines: Array<{
      dishId: string;
      name: string;
      slug: string;
      image: string | null;
      categoryName: string;
      basePrice: number;
      variantId: string | null;
      variantName: string | null;
      variantPrice: number;
      addOns: Array<{ id: string; name: string; price: number }>;
      quantity: number;
      instructions?: string;
    }> = [];
    let skipped = 0;

    for (const item of order.items) {
      const dish = item.dish;
      if (!dish || !dish.isAvailable) {
        skipped += 1;
        continue;
      }
      const variant = item.variantName
        ? dish.variants.find((option) => option.name === item.variantName)
        : undefined;

      const wantedAddOns = new Set(parseAddOnNames(item.addOns));
      const addOns = dish.addOns
        .filter(({ addOn }) => addOn.isActive && wantedAddOns.has(addOn.name))
        .map(({ addOn }) => ({
          id: addOn.id,
          name: addOn.name,
          price: addOn.price,
        }));

      lines.push({
        dishId: dish.id,
        name: dish.name,
        slug: dish.slug,
        image: dish.image,
        categoryName: dish.category.name,
        basePrice: dish.price,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        variantPrice: variant?.priceDelta ?? 0,
        addOns,
        quantity: Math.min(20, item.quantity),
        instructions: item.instructions ?? undefined,
      });
    }

    return { success: true, lines, skipped };
  }
}

export const orderService = new OrderService();
