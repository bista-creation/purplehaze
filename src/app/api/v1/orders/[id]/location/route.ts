import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { locationStore } from "@/lib/location-store";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const orderId = params.id;
  if (!orderId) {
    return jsonError("BAD_REQUEST", "Order ID is required", 400);
  }

  const user = (await getAuthContext(req)) || (await getCurrentUser());
  if (user && user.role === "RIDER") {
    return jsonError("FORBIDDEN", "Riders cannot access customer tracking endpoints", 403);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      publicToken: true,
      status: true,
    },
  });

  if (!order) {
    return jsonError("NOT_FOUND", "Order not found", 404);
  }

  // Authorization check: User session or matching public guest token (via header or query)
  const isOwner = user && (user.role === "ADMIN" || user.role === "STAFF" || order.userId === user.id);
  const guestToken =
    req.headers.get("x-order-token") || req.nextUrl.searchParams.get("token");
  const isAuthorizedGuest = Boolean(guestToken && order.publicToken && guestToken === order.publicToken);

  if (!isOwner && !isAuthorizedGuest) {
    return jsonError("FORBIDDEN", "Unauthorized to view tracking location", 403);
  }

  const isStaffOrAdmin = Boolean(user && (user.role === "ADMIN" || user.role === "STAFF"));
  if (order.status !== "OUT_FOR_DELIVERY" && !isStaffOrAdmin) {
    return jsonOk({
      active: false,
      status: order.status,
      message: "Order is not currently out for delivery",
      location: null,
    });
  }

  const location = await locationStore.getLocation(order.id);

  return jsonOk({
    active: true,
    status: order.status,
    location,
  });
}
