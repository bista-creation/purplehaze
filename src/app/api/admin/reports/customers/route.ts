import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { resolveReportRange } from "@/lib/report-range";
import { formatDateTime } from "@/lib/utils";
import { paisaToRupees } from "@/lib/money";
import { realOrdersWhere } from "@/lib/test-data";

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams, { defaultDays: null });
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const blocked = searchParams.get("blocked") === "1";

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      isTest: false,
      ...(blocked ? { isBlocked: true } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5_000,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isBlocked: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const spend = new Map<string, number>();
  for (let index = 0; index < customers.length; index += 400) {
    const ids = customers
      .slice(index, index + 400)
      .map((customer) => customer.id);
    const rows = await prisma.order.groupBy({
      by: ["userId"],
      where: realOrdersWhere({
        userId: { in: ids },
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
      }),
      _sum: { total: true },
    });
    for (const row of rows) {
      if (row.userId) spend.set(row.userId, row._sum.total ?? 0);
    }
  }

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.customers",
    entity: "User",
    details: { rows: customers.length, q: q || null, blocked, range },
  });

  const body = toCsv(
    [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
      { key: "verified", label: "Email verified" },
      { key: "joined", label: "Joined (Nepal)" },
      { key: "orders", label: "Orders" },
      { key: "paidSpendNpr", label: "Paid spend NPR" },
    ],
    customers.map((customer) => ({
      name: customer.name ?? "",
      email: customer.email,
      phone: customer.phone ?? "",
      status: customer.isBlocked ? "Blocked" : "Active",
      verified: customer.emailVerified ? "Yes" : "No",
      joined: formatDateTime(customer.createdAt),
      orders: customer._count.orders,
      paidSpendNpr: paisaToRupees(spend.get(customer.id) ?? 0).toFixed(2),
    })),
  );

  const suffix = range ? `-${range.fromDay}-to-${range.toDay}` : "";
  return csvResponse(`purple-haze-customers${suffix}.csv`, body);
}
