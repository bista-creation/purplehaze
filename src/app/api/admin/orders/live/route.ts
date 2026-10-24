import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaffRole } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const [pendingOrders, activeCount, latestHistory] = await Promise.all([
      prisma.order.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          type: true,
          createdAt: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      }),
      prisma.order.count({
        where: {
          status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
        },
      }),
      prisma.orderStatusHistory.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const pendingCount = pendingOrders.length;
    const newestPending = pendingOrders[0] ?? null;
    const overdueCount = pendingOrders.filter(
      (o) => new Date(o.createdAt) < tenMinutesAgo,
    ).length;

    const latestUpdate = Math.max(
      newestPending ? new Date(newestPending.createdAt).getTime() : 0,
      latestHistory ? new Date(latestHistory.createdAt).getTime() : 0,
    );

    return NextResponse.json({
      pendingCount,
      activeCount,
      overdueCount,
      newestPending,
      latestUpdate,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Staff live order polling error:", error);
    return NextResponse.json(
      { error: "Could not fetch live order stats" },
      { status: 500 },
    );
  }
}
