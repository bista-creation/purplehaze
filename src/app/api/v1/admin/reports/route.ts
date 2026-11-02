import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonOk } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromStr) {
    const d = new Date(fromStr);
    if (!isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (toStr) {
    const d = new Date(toStr);
    if (!isNaN(d.getTime())) dateFilter.lte = d;
  }

  const orderWhere = {
    isTest: false,
    ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
  };

  const [
    totalOrders,
    completedOrders,
    activeOrders,
    totalReservations,
    totalEvents,
    revenueAgg,
    recentOrders,
    topItems,
  ] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: { ...orderWhere, status: "COMPLETED" } }),
    prisma.order.count({
      where: {
        ...orderWhere,
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
      },
    }),
    prisma.reservation.count({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
    }),
    prisma.eventBooking.count({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
    }),
    prisma.order.aggregate({
      where: { ...orderWhere, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: orderWhere,
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        type: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["dishId", "name"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  return jsonOk({
    summary: {
      totalOrders,
      completedOrders,
      activeOrders,
      totalReservations,
      totalEvents,
      totalRevenuePaisa: revenueAgg._sum.total ?? 0,
      totalRevenueNpr: (revenueAgg._sum.total ?? 0) / 100,
    },
    recentOrders,
    topSellingDishes: topItems.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      quantitySold: item._sum.quantity ?? 0,
      totalSalesPaisa: item._sum.lineTotal ?? 0,
    })),
  });
}
