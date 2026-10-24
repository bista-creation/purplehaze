import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/security";
import { STATUS_META, type OrderStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    const decodedOrderNumber = decodeURIComponent(orderNumber);
    const [order, user] = await Promise.all([
      prisma.order.findUnique({
        where: { orderNumber: decodedOrderNumber },
        include: {
          statusHistory: { orderBy: { createdAt: "asc" } },
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              variantName: true,
            },
          },
        },
      }),
      getCurrentUser(),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const tokenAuthorized = Boolean(token && token === order.publicToken);
    const ownerAuthorized = Boolean(user && order.userId === user.id);
    const staffAuthorized = Boolean(user && (user.role === "ADMIN" || user.role === "STAFF"));

    if (!tokenAuthorized && !ownerAuthorized && !staffAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentStatus = order.status as OrderStatus;
    const meta = STATUS_META[currentStatus] ?? {
      label: order.status,
      description: "Order is processing.",
      tone: "amber" as const,
    };

    // Calculate progress percentage
    let progress = 10;
    if (currentStatus === "CONFIRMED") progress = 35;
    else if (currentStatus === "PREPARING") progress = 65;
    else if (currentStatus === "READY") progress = 85;
    else if (currentStatus === "OUT_FOR_DELIVERY") progress = 90;
    else if (currentStatus === "COMPLETED") progress = 100;
    else if (currentStatus === "CANCELLED") progress = 0;

    // Estimate remaining preparation time
    let remainingMinutes: number | null = null;
    if (order.acceptedAt && ["CONFIRMED", "PREPARING"].includes(order.status)) {
      const elapsedMs = Date.now() - new Date(order.acceptedAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
      // Standard restaurant prep target: 25 minutes
      const targetPrep = 25;
      remainingMinutes = Math.max(1, targetPrep - elapsedMinutes);
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      type: order.type,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      tableNumber: order.tableNumber,
      createdAt: order.createdAt,
      acceptedAt: order.acceptedAt,
      scheduledFor: order.scheduledFor,
      progress,
      statusMeta: meta,
      remainingMinutes,
      itemsCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
      history: order.statusHistory.map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt,
        changedBy: h.changedBy,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Order status check error:", error);
    return NextResponse.json(
      { error: "Could not retrieve order status" },
      { status: 500 },
    );
  }
}
