import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { generateDeliveryOtp } from "@/lib/security/otp";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Order ID is required.", 400);
  }

  const user = await getAuthContext(req);
  if (user?.role === "RIDER") {
    return jsonError("FORBIDDEN", "Riders cannot access customer tracking endpoints.", 403);
  }

  const headerToken = req.headers.get("x-order-token");
  const { searchParams } = new URL(req.url);
  const token = headerToken || searchParams.get("token");

  // Admin or staff can view any order
  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  let order = await orderService.getOrderById(id, isStaffOrAdmin ? undefined : user?.id);

  if (!order && token) {
    // Check if accessible by public token (by CUID id or orderNumber)
    order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        publicToken: token,
      },
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

  if (!order) {
    return jsonError("NOT_FOUND", "Order not found or access denied.", 404);
  }

  // Determine if caller is authorized owner or guest with valid publicToken
  const isAuthorizedOwnerOrGuest =
    isStaffOrAdmin ||
    (user?.id && order.userId === user.id) ||
    (token && token === order.publicToken);

  // Expose deliveryOtp ONLY when order is OUT_FOR_DELIVERY to authorized owner/guest/admin
  let deliveryOtp: string | null = null;
  if (
    isAuthorizedOwnerOrGuest &&
    order.status === "OUT_FOR_DELIVERY" &&
    order.delivery
  ) {
    deliveryOtp = generateDeliveryOtp(order.delivery.id, order.delivery.otpVersion);
  }

  const sanitizedDelivery = order.delivery
    ? {
        id: order.delivery.id,
        status: order.delivery.status,
        provider: order.delivery.provider,
        assignedAt: order.delivery.assignedAt,
        pickedUpAt: order.delivery.pickedUpAt,
        deliveredAt: order.delivery.deliveredAt,
      }
    : null;

  return jsonOk({
    ...order,
    delivery: sanitizedDelivery,
    deliveryOtp,
  });
}
