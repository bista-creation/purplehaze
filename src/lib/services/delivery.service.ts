/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceError, ServiceResult } from "./rider.service";
import { verifyDeliveryOtp } from "@/lib/security/otp";
import { writeAuditLog } from "@/lib/audit";
import { scheduleAssignmentTimeout } from "@/lib/qstash";
import { broadcastEvent } from "@/lib/realtime/broadcast";
import { REALTIME_CHANNELS, REALTIME_EVENTS } from "@/lib/shared/realtime";
import { locationStore } from "@/lib/location-store";

export const deliveryService = {
  /**
   * Admin/Staff dispatch order to an on-duty rider with verified license
   */
  async dispatchOrder(
    orderId: string,
    riderProfileId: string,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<any>> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Order not found", 404),
      };
    }

    if (order.type !== "DELIVERY") {
      return {
        success: false,
        error: new ServiceError("INVALID_ORDER_TYPE", "Only delivery orders can be assigned to riders", 400),
      };
    }

    // Must be at least CONFIRMED, PREPARING, or READY
    if (!["CONFIRMED", "PREPARING", "READY"].includes(order.status)) {
      return {
        success: false,
        error: new ServiceError(
          "INVALID_ORDER_STATUS",
          `Cannot dispatch order with status '${order.status}'. Order must be confirmed or ready.`,
          400
        ),
      };
    }

    const rider = await prisma.riderProfile.findUnique({
      where: { id: riderProfileId },
      include: { user: true },
    });

    if (!rider || rider.user.isBlocked) {
      return {
        success: false,
        error: new ServiceError("RIDER_UNAVAILABLE", "Rider account is invalid or blocked.", 400),
      };
    }

    if (rider.shiftStatus !== "ON_DUTY") {
      return {
        success: false,
        error: new ServiceError("RIDER_OFF_DUTY", "Cannot assign order: rider is currently off duty.", 400),
      };
    }

    if (rider.licenseStatus !== "VERIFIED") {
      return {
        success: false,
        error: new ServiceError("UNVERIFIED_LICENSE", "Rider license is not verified.", 400),
      };
    }

    if (rider.licenseExpiresAt && rider.licenseExpiresAt < new Date()) {
      return {
        success: false,
        error: new ServiceError("EXPIRED_LICENSE", "Rider license has expired.", 400),
      };
    }

    // Generate assignment attempt ID for QStash timeout idempotency
    const assignmentAttemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Upsert delivery record
    const delivery = await prisma.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        provider: "OWN_RIDER",
        status: "ASSIGNED",
        riderId: rider.id,
        assignmentAttemptId,
        assignedAt: new Date(),
        deliveryFeePaisa: Math.round(order.deliveryFee * 100),
        codAmountPaisa: order.paymentMethod === "COD" ? Math.round(order.total * 100) : 0,
        otpVersion: 1,
        otpAttempts: 0,
        otpLocked: false,
      },
      update: {
        provider: "OWN_RIDER",
        status: "ASSIGNED",
        riderId: rider.id,
        assignmentAttemptId,
        assignedAt: new Date(),
        otpVersion: { increment: 1 }, // Invalidate prior OTP on re-dispatch
        otpAttempts: 0,
        otpLocked: false,
        failureReason: null,
        failureNotes: null,
        failedAt: null,
      },
    });

    // Record append-only attempt
    await prisma.deliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        riderId: rider.id,
        action: "ASSIGNED",
        notes: `Assigned to rider ${rider.user.name || rider.user.email} by ${adminUser.email}`,
      },
    });

    // Schedule 120s timeout callback via QStash
    await scheduleAssignmentTimeout({
      deliveryId: delivery.id,
      assignmentAttemptId,
      delaySeconds: 120,
    });

    // Broadcast realtime event
    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryStatus: "ASSIGNED",
      riderId: rider.id,
    });

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "delivery.dispatch",
      entity: "Delivery",
      entityId: delivery.id,
      details: {
        orderNumber: order.orderNumber,
        riderEmail: rider.user.email,
        assignmentAttemptId,
      },
    });

    return { success: true, data: delivery };
  },

  /**
   * Rider accepts delivery within 120s window
   */
  async acceptDelivery(deliveryId: string, riderUserId: string): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    if (delivery.status !== "ASSIGNED") {
      return {
        success: false,
        error: new ServiceError(
          "INVALID_STATE",
          `Cannot accept delivery with status '${delivery.status}'.`,
          400
        ),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        riderId: delivery.riderId,
        action: "ACCEPTED",
      },
    });

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: delivery.order.status,
      deliveryStatus: "ACCEPTED",
      riderId: delivery.riderId,
    });

    return { success: true, data: updated };
  },

  /**
   * Rider declines assigned delivery
   */
  async declineDelivery(
    deliveryId: string,
    riderUserId: string,
    reason: string
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    if (delivery.status !== "ASSIGNED") {
      return {
        success: false,
        error: new ServiceError("INVALID_STATE", "Only freshly assigned orders can be declined.", 400),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "DECLINED",
        riderId: null, // Released for re-dispatch
        otpVersion: { increment: 1 },
      },
    });

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        riderId: delivery.riderId,
        action: "DECLINED",
        reason: reason || "Rider declined assignment",
      },
    });

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: delivery.order.status,
      deliveryStatus: "DECLINED",
    });

    return { success: true, data: updated };
  },

  /**
   * Rider picks up food at kitchen (Kitchen guard: order MUST be READY)
   */
  async pickupDelivery(deliveryId: string, riderUserId: string): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    if (delivery.status !== "ACCEPTED") {
      // Idempotent retry: if already picked up or beyond (e.g. replayed from offline queue), return success
      if (
        delivery.status === "PICKED_UP" ||
        delivery.status === "ARRIVED_AT_CUSTOMER" ||
        delivery.status === "DELIVERED"
      ) {
        return { success: true, data: delivery };
      }
      return {
        success: false,
        error: new ServiceError("INVALID_STATE", `Cannot pick up delivery with status '${delivery.status}'.`, 400),
      };
    }

    // Kitchen guard: Order MUST be READY (or already OUT_FOR_DELIVERY in re-attempt)
    if (delivery.order.status !== "READY" && delivery.order.status !== "OUT_FOR_DELIVERY") {
      return {
        success: false,
        error: new ServiceError(
          "ORDER_NOT_READY",
          "Food is still being prepared by the kitchen. Wait until status is READY.",
          400
        ),
      };
    }

    const [updatedDelivery] = await prisma.$transaction([
      prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "PICKED_UP",
          pickedUpAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "OUT_FOR_DELIVERY",
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: "OUT_FOR_DELIVERY",
          note: `Picked up by delivery rider`,
        },
      }),
      prisma.deliveryAttempt.create({
        data: {
          deliveryId,
          riderId: delivery.riderId,
          action: "PICKED_UP",
        },
      }),
    ]);

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: "OUT_FOR_DELIVERY",
      deliveryStatus: "PICKED_UP",
      riderId: delivery.riderId,
    });

    return { success: true, data: updatedDelivery };
  },

  /**
   * Rider arrives at customer destination
   */
  async arrivedDelivery(deliveryId: string, riderUserId: string): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    if (delivery.status !== "PICKED_UP") {
      // Idempotent retry: if already arrived or delivered (replayed from offline queue), return success
      if (
        delivery.status === "ARRIVED_AT_CUSTOMER" ||
        delivery.status === "DELIVERED"
      ) {
        return { success: true, data: delivery };
      }
      return {
        success: false,
        error: new ServiceError("INVALID_STATE", `Cannot mark arrived from status '${delivery.status}'.`, 400),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "ARRIVED_AT_CUSTOMER",
        arrivedAt: new Date(),
      },
    });

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        riderId: delivery.riderId,
        action: "ARRIVED_AT_CUSTOMER",
      },
    });

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: "OUT_FOR_DELIVERY",
      deliveryStatus: "ARRIVED_AT_CUSTOMER",
      riderId: delivery.riderId,
    });

    return { success: true, data: updated };
  },

  /**
   * Rider verifies 6-digit delivery OTP from customer and completes delivery
   */
  async completeDeliveryWithOtp(
    deliveryId: string,
    riderUserId: string,
    candidateOtp: string,
    cashCollectedPaisa?: number
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    if (delivery.status !== "ARRIVED_AT_CUSTOMER" && delivery.status !== "PICKED_UP") {
      return {
        success: false,
        error: new ServiceError(
          "INVALID_STATE",
          `Cannot verify OTP for delivery with status '${delivery.status}'. Must be arrived at customer.`,
          400
        ),
      };
    }

    if (delivery.otpLocked) {
      return {
        success: false,
        error: new ServiceError(
          "OTP_LOCKED",
          "OTP entry locked due to 3 failed attempts. Please call restaurant administration to unlock and verify.",
          403
        ),
      };
    }

    // Verify OTP using constant-time comparison
    const isValid = verifyDeliveryOtp(delivery.id, delivery.otpVersion, candidateOtp);

    if (!isValid) {
      const nextAttempts = delivery.otpAttempts + 1;
      const isNowLocked = nextAttempts >= 3;

      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          otpAttempts: nextAttempts,
          otpLocked: isNowLocked,
        },
      });

      return {
        success: false,
        error: new ServiceError(
          isNowLocked ? "OTP_LOCKED" : "INVALID_OTP",
          isNowLocked
            ? "Incorrect OTP. 3 attempts exceeded. OTP is now locked. Please contact restaurant management."
            : `Incorrect OTP. ${3 - nextAttempts} attempt(s) remaining.`,
          400
        ),
      };
    }

    // OTP Verified! Advance delivery to DELIVERED and order to COMPLETED
    const collectedCash =
      cashCollectedPaisa !== undefined
        ? cashCollectedPaisa
        : delivery.codAmountPaisa;

    const [updatedDelivery] = await prisma.$transaction([
      prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          otpVerifiedAt: new Date(),
          cashCollectedPaisa: collectedCash,
        },
      }),
      prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "COMPLETED",
          ...(delivery.order.paymentMethod === "COD" ? { paymentStatus: "PAID" } : {}),
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: "COMPLETED",
          note: `Delivered successfully. OTP verified.`,
        },
      }),
      prisma.deliveryAttempt.create({
        data: {
          deliveryId,
          riderId: delivery.riderId,
          action: "DELIVERED",
          notes: `Cash collected: Rs. ${(collectedCash / 100).toFixed(2)}`,
        },
      }),
    ]);

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: "COMPLETED",
      deliveryStatus: "DELIVERED",
      riderId: delivery.riderId,
    });

    await writeAuditLog({
      userId: delivery.rider.userId,
      actorEmail: delivery.rider.user.email,
      action: "delivery.complete",
      entity: "Delivery",
      entityId: delivery.id,
      details: {
        orderNumber: delivery.order.orderNumber,
        codPaisaCollected: collectedCash,
      },
    });

    // Minimization invariant: immediately purge transient GPS location from Redis
    await locationStore.evictLocation(delivery.orderId);

    return { success: true, data: updatedDelivery };
  },

  /**
   * Rider records an exception or failed delivery attempt
   */
  async recordDeliveryFailure(
    deliveryId: string,
    riderUserId: string,
    reason: string,
    notes?: string
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery || !delivery.rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.rider.userId !== riderUserId) {
      return {
        success: false,
        error: new ServiceError("FORBIDDEN", "This delivery is not assigned to you.", 403),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: reason,
        failureNotes: notes || null,
        otpVersion: { increment: 1 },
      },
    });

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        riderId: delivery.riderId,
        action: "FAILED",
        reason,
        notes,
      },
    });

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: delivery.order.status,
      deliveryStatus: "FAILED",
      reason,
    });

    // Minimization invariant: purge location on failure/exception
    await locationStore.evictLocation(delivery.orderId);

    return { success: true, data: updated };
  },

  /**
   * Idempotent QStash callback for 120s assignment timeout
   */
  async handleAssignmentTimeout(
    deliveryId: string,
    assignmentAttemptId: string
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: { user: true },
        },
        order: true,
      },
    });

    if (!delivery) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    // Idempotency check: only timeout if still ASSIGNED with the matching attempt ID
    if (delivery.status === "ASSIGNED" && delivery.assignmentAttemptId === assignmentAttemptId) {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "TIMEOUT",
          riderId: null, // Released
          otpVersion: { increment: 1 },
        },
      });

      await prisma.deliveryAttempt.create({
        data: {
          deliveryId,
          riderId: delivery.riderId,
          action: "TIMEOUT",
          notes: "Rider did not accept within 120 seconds",
        },
      });

      await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
        orderId: delivery.orderId,
        orderNumber: delivery.order.orderNumber,
        status: delivery.order.status,
        deliveryStatus: "TIMEOUT",
      });

      return { success: true, data: updated };
    }

    return {
      success: true,
      data: { message: "Delivery already progressed past assignment attempt.", status: delivery.status },
    };
  },

  /**
   * Admin-only emergency override with mandatory written audit reason
   */
  async adminOverride(
    deliveryId: string,
    newStatus: string,
    reason: string,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<any>> {
    if (!reason || reason.trim().length < 5) {
      return {
        success: false,
        error: new ServiceError("INVALID_REASON", "A clear written reason is mandatory for admin overrides.", 422),
      };
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        ...(newStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });

    if (newStatus === "DELIVERED") {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: "COMPLETED" },
      });
    }

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        action: `ADMIN_OVERRIDE_${newStatus}`,
        reason,
        notes: `Overridden by admin ${adminUser.email}`,
      },
    });

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "delivery.admin_override",
      entity: "Delivery",
      entityId: deliveryId,
      details: {
        orderNumber: delivery.order.orderNumber,
        priorStatus: delivery.status,
        newStatus,
        reason,
      },
    });

    if (newStatus === "DELIVERED" || newStatus === "FAILED" || newStatus === "CANCELLED") {
      await locationStore.evictLocation(delivery.orderId);
    }

    return { success: true, data: updated };
  },

  /**
   * Admin unlocks and regenerates delivery OTP
   */
  async adminUnlockOtp(
    deliveryId: string,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        otpAttempts: 0,
        otpLocked: false,
        otpVersion: { increment: 1 }, // Generates fresh OTP
      },
    });

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "delivery.otp_unlock",
      entity: "Delivery",
      entityId: deliveryId,
      details: {
        orderNumber: delivery.order.orderNumber,
        newOtpVersion: updated.otpVersion,
      },
    });

    return { success: true, data: { otpLocked: false, otpVersion: updated.otpVersion } };
  },

  /**
   * Kitchen / Admin acknowledges that undelivered food has returned to kitchen
   */
  async acknowledgeFoodReturn(
    deliveryId: string,
    staffUser: { id: string; email: string },
    notes?: string
  ): Promise<ServiceResult<any>> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Delivery not found.", 404),
      };
    }

    if (delivery.status !== "FAILED") {
      return {
        success: false,
        error: new ServiceError(
          "INVALID_STATE",
          `Food return can only be acknowledged for FAILED deliveries (current status: '${delivery.status}').`,
          400
        ),
      };
    }

    await prisma.deliveryAttempt.create({
      data: {
        deliveryId,
        riderId: delivery.riderId,
        action: "FOOD_RETURNED_TO_KITCHEN",
        notes: notes || `Food return acknowledged by ${staffUser.email}`,
      },
    });

    await writeAuditLog({
      userId: staffUser.id,
      actorEmail: staffUser.email,
      action: "delivery.food_return_acknowledged",
      entity: "Delivery",
      entityId: deliveryId,
      details: {
        orderNumber: delivery.order.orderNumber,
        notes,
      },
    });

    await broadcastEvent(REALTIME_CHANNELS.adminOrders, REALTIME_EVENTS.orderStatusUpdated, {
      orderId: delivery.orderId,
      orderNumber: delivery.order.orderNumber,
      status: delivery.order.status,
      deliveryStatus: "FAILED",
      foodReturned: true,
    });

    return { success: true, data: { deliveryId, foodReturned: true } };
  },

  /**
   * Fetch active deliveries and candidate orders for dispatch board
   */
  async listDeliveriesForDispatch(): Promise<ServiceResult<any>> {
    const activeDeliveries = await prisma.delivery.findMany({
      where: {
        status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER", "TIMEOUT", "DECLINED", "FAILED"] },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            total: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: { name: true, quantity: true },
            },
          },
        },
        rider: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // Also get orders that are READY or PREPARING for delivery but not yet dispatched
    const undispatchedOrders = await prisma.order.findMany({
      where: {
        type: "DELIVERY",
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
        delivery: null,
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        deliveryAddress: true,
        total: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        items: {
          select: { name: true, quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const formattedDeliveries = activeDeliveries.map((d) => {
      const assignedDurationMs = now - new Date(d.assignedAt).getTime();
      const isStuckAssigned = d.status === "ASSIGNED" && assignedDurationMs > 3 * 60 * 1000; // > 3 minutes

      return {
        id: d.id,
        orderId: d.orderId,
        orderNumber: d.order.orderNumber,
        customerName: d.order.customerName,
        customerPhone: d.order.customerPhone,
        deliveryAddress: d.order.deliveryAddress,
        total: d.order.total,
        orderStatus: d.order.status,
        deliveryStatus: d.status,
        provider: d.provider,
        paymentMethod: d.order.paymentMethod,
        rider: d.rider
          ? {
              id: d.rider.id,
              name: d.rider.user.name,
              phone: d.rider.user.phone,
              vehicleType: d.rider.vehicleType,
            }
          : null,
        otpLocked: d.otpLocked,
        otpAttempts: d.otpAttempts,
        assignedAt: d.assignedAt,
        acceptedAt: d.acceptedAt,
        pickedUpAt: d.pickedUpAt,
        arrivedAt: d.arrivedAt,
        isStuckAssigned,
        failureReason: d.failureReason,
        items: d.order.items,
      };
    });

    return {
      success: true,
      data: {
        deliveries: formattedDeliveries,
        undispatchedOrders,
      },
    };
  },
};
