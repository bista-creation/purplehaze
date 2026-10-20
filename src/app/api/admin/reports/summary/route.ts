import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { resolveReportRange } from "@/lib/report-range";
import { paisaToRupees } from "@/lib/money";
import { realOrdersWhere } from "@/lib/test-data";

function nepalDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams, { defaultDays: 30 });
  if (!range) {
    return new Response("Enter a valid date range.", { status: 400 });
  }

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: realOrdersWhere({ createdAt: { gte: range.from, lte: range.to } }),
      select: {
        createdAt: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        taxAmount: true,
        discountAmount: true,
        total: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        isTest: false,
        createdAt: { gte: range.from, lte: range.to },
      },
      select: { createdAt: true },
    }),
  ]);

  const days: string[] = [];
  const cursor = new Date(`${range.fromDay}T00:00:00+05:45`);
  const end = new Date(`${range.toDay}T00:00:00+05:45`);
  while (cursor <= end) {
    days.push(nepalDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const daily = new Map(
    days.map((day) => [
      day,
      {
        day,
        orders: 0,
        cancelled: 0,
        paidOrders: 0,
        revenue: 0,
        orderValue: 0,
        deliveryFees: 0,
        tax: 0,
        discounts: 0,
        newCustomers: 0,
      },
    ]),
  );

  for (const order of orders) {
    const entry = daily.get(nepalDateKey(order.createdAt));
    if (!entry) continue;
    entry.orders += 1;
    if (order.status === "CANCELLED") {
      entry.cancelled += 1;
      continue;
    }
    entry.orderValue += order.total;
    entry.deliveryFees += order.deliveryFee;
    entry.tax += order.taxAmount;
    entry.discounts += order.discountAmount;
    if (order.paymentStatus === "PAID") {
      entry.paidOrders += 1;
      entry.revenue += order.total;
    }
  }
  for (const customer of customers) {
    const entry = daily.get(nepalDateKey(customer.createdAt));
    if (entry) entry.newCustomers += 1;
  }

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.summary",
    entity: "Order",
    details: {
      days: days.length,
      range: { fromDay: range.fromDay, toDay: range.toDay },
    },
  });

  const body = toCsv(
    [
      { key: "day", label: "Date (Nepal)" },
      { key: "orders", label: "Orders placed" },
      { key: "cancelled", label: "Cancelled" },
      { key: "paidOrders", label: "Paid orders" },
      { key: "revenueNpr", label: "Paid revenue NPR" },
      { key: "orderValueNpr", label: "Order value NPR" },
      { key: "deliveryFeesNpr", label: "Delivery fees NPR" },
      { key: "taxNpr", label: "Tax NPR" },
      { key: "discountsNpr", label: "Discounts NPR" },
      { key: "newCustomers", label: "New customers" },
    ],
    days.map((day) => {
      const entry = daily.get(day)!;
      return {
        day,
        orders: entry.orders,
        cancelled: entry.cancelled,
        paidOrders: entry.paidOrders,
        revenueNpr: paisaToRupees(entry.revenue).toFixed(2),
        orderValueNpr: paisaToRupees(entry.orderValue).toFixed(2),
        deliveryFeesNpr: paisaToRupees(entry.deliveryFees).toFixed(2),
        taxNpr: paisaToRupees(entry.tax).toFixed(2),
        discountsNpr: paisaToRupees(entry.discounts).toFixed(2),
        newCustomers: entry.newCustomers,
      };
    }),
  );

  return csvResponse(
    `purple-haze-daily-summary-${range.fromDay}-to-${range.toDay}.csv`,
    body,
  );
}
