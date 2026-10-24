import nextDynamic from "next/dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  CalendarRange,
  Download,
  FileSpreadsheet,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.RevenueChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);

const TopDishChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.TopDishChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { formatNPR } from "@/lib/money";
import { realOrdersWhere } from "@/lib/test-data";
import { formatDate, toDateInput } from "@/lib/utils";
import { parseNepalDateTime, todayInNepal } from "@/lib/time";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_META,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function nepalDayStart(day: string) {
  return new Date(`${day}T00:00:00+05:45`);
}

function dateStringInNepal(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin("/admin/reports");
  const params = await searchParams;
  const today = todayInNepal();
  const defaultFrom = new Date(nepalDayStart(today));
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const validDate = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  let fromDay = validDate(params.from) ?? toDateInput(defaultFrom);
  let toDay = validDate(params.to) ?? today;
  if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
  const from = parseNepalDateTime(`${fromDay}T00:00`) ?? nepalDayStart(today);
  const to = parseNepalDateTime(`${toDay}T23:59:59`) ?? new Date();
  const rangeMs = Math.max(DAY_MS, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(from.getTime() - rangeMs);
  const useMonthly = rangeMs > 45 * DAY_MS;

  type ReportOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    type: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    subtotal: number;
    createdAt: Date;
    userId: string | null;
    zoneId: string | null;
  };

  type TopDishRow = {
    name: string;
    _sum: { quantity: number | null; lineTotal: number | null };
  };

  type TopCustomerRow = {
    userId: string | null;
    _sum: { total: number | null };
    _count: { _all: number };
  };

  type ZoneRow = {
    zoneId: string | null;
    _count: { _all: number };
    _sum: { deliveryFee: number | null };
  };

  type ZoneItem = { id: string; name: string };

  let orders: ReportOrder[] = [];
  let previousPaid = { _sum: { total: null as number | null }, _count: { _all: 0 } };
  let newCustomers = 0;
  let reservationCount = 0;
  let eventCount = 0;
  let topDishes: TopDishRow[] = [];
  let topCustomerRows: TopCustomerRow[] = [];
  let zoneRows: ZoneRow[] = [];
  let zones: ZoneItem[] = [];

  try {
    const [ord, pp, nc, rc, ec, td, tcr, zr, zn] = await Promise.all([
    prisma.order.findMany({
      where: realOrdersWhere({ createdAt: { gte: from, lte: to } }),
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        type: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        subtotal: true,
        createdAt: true,
        userId: true,
        zoneId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.aggregate({
      where: realOrdersWhere({
        createdAt: { gte: previousFrom, lte: previousTo },
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
      }),
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        isTest: false,
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.reservation.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.eventBooking.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.orderItem.groupBy({
      by: ["name"],
      _sum: { quantity: true, lineTotal: true },
      where: {
        order: realOrdersWhere({
          createdAt: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        }),
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: realOrdersWhere({
        createdAt: { gte: from, lte: to },
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
        userId: { not: null },
      }),
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 6,
    }),
    prisma.order.groupBy({
      by: ["zoneId"],
      where: realOrdersWhere({
        createdAt: { gte: from, lte: to },
        type: "DELIVERY",
        status: { not: "CANCELLED" },
      }),
      _count: { _all: true },
      _sum: { deliveryFee: true },
    }),
    prisma.deliveryZone.findMany({ select: { id: true, name: true } }),
    ]);
    orders = ord;
    previousPaid = pp;
    newCustomers = nc;
    reservationCount = rc;
    eventCount = ec;
    topDishes = td;
    topCustomerRows = tcr;
    zoneRows = zr;
    zones = zn;
  } catch {
    console.warn("Database offline in AdminReportsPage; using empty reports metrics.");
  }

  const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
  const paidOrders = activeOrders.filter(
    (order) => order.paymentStatus === "PAID",
  );
  const grossRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const orderValue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder =
    activeOrders.length > 0 ? Math.round(orderValue / activeOrders.length) : 0;
  const previousRevenue = previousPaid._sum.total ?? 0;
  const revenueChange =
    previousRevenue > 0
      ? Math.round(((grossRevenue - previousRevenue) / previousRevenue) * 100)
      : null;

  const buckets = new Map<
    string,
    { label: string; revenue: number; orders: number }
  >();
  if (useMonthly) {
    const cursor = new Date(from);
    cursor.setUTCDate(1);
    while (cursor <= to) {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
      }).format(cursor);
      buckets.set(key, {
        label: new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kathmandu",
          month: "short",
          year: "2-digit",
        }).format(cursor),
        revenue: 0,
        orders: 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else {
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = dateStringInNepal(cursor);
      buckets.set(key, {
        label: new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kathmandu",
          day: "numeric",
          month: "short",
        }).format(cursor),
        revenue: 0,
        orders: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  for (const order of orders) {
    const key = useMonthly
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kathmandu",
          year: "numeric",
          month: "2-digit",
        }).format(order.createdAt)
      : dateStringInNepal(order.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (order.status !== "CANCELLED") {
      bucket.orders += 1;
      if (order.paymentStatus === "PAID") bucket.revenue += order.total;
    }
  }
  const chartData = [...buckets.values()];

  const typeTotals = new Map<string, number>();
  const paymentTotals = new Map<string, number>();
  const statusTotals = new Map<string, number>();
  for (const order of orders) {
    typeTotals.set(order.type, (typeTotals.get(order.type) ?? 0) + 1);
    paymentTotals.set(
      order.paymentMethod,
      (paymentTotals.get(order.paymentMethod) ?? 0) + 1,
    );
    statusTotals.set(order.status, (statusTotals.get(order.status) ?? 0) + 1);
  }

  const topCustomerIds = topCustomerRows
    .map((row) => row.userId)
    .filter((id): id is string => Boolean(id));
  const topCustomerProfiles = await prisma.user.findMany({
    where: { id: { in: topCustomerIds } },
    select: { id: true, name: true, email: true },
  });
  const profileMap = new Map(
    topCustomerProfiles.map((profile) => [profile.id, profile]),
  );
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone.name]));
  const topDishData = topDishes.map((dish) => ({
    name: dish.name.length > 18 ? `${dish.name.slice(0, 17)}…` : dish.name,
    quantity: dish._sum.quantity ?? 0,
  }));

  const rangeQuery = `from=${fromDay}&to=${toDay}`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Reports"
        description="Revenue, orders and customer activity for the selected Nepal-time date range. Revenue counts verified paid orders only. Test orders are excluded from reports and CSV exports. COD orders count as unpaid until staff record collection."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/admin/reports/orders?${rangeQuery}`}>
                <Download className="size-3.5" /> Orders CSV
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/admin/reports/summary?${rangeQuery}`}>
                <FileSpreadsheet className="size-3.5" /> Summary CSV
              </Link>
            </Button>
          </>
        }
      />

      <AdminCard className="mb-4 p-4">
        <form
          action="/admin/reports"
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div>
            <label
              htmlFor="report-from"
              className="mb-1.5 block text-xs font-semibold"
            >
              From (Nepal)
            </label>
            <Input
              id="report-from"
              name="from"
              type="date"
              defaultValue={fromDay}
            />
          </div>
          <div>
            <label
              htmlFor="report-to"
              className="mb-1.5 block text-xs font-semibold"
            >
              To (Nepal)
            </label>
            <Input id="report-to" name="to" type="date" defaultValue={toDay} />
          </div>
          <Button type="submit" variant="outline">
            <CalendarRange className="size-4" /> Run report
          </Button>
          <p className="text-[11px] leading-5 text-muted-foreground sm:ml-auto">
            {formatDate(from)} – {formatDate(to)} · {orders.length} order
            {orders.length === 1 ? "" : "s"} in range
          </p>
        </form>
      </AdminCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid revenue"
          value={formatNPR(grossRevenue)}
          icon={Banknote}
          tone="green"
          trend={
            revenueChange !== null
              ? {
                  value: `${Math.abs(revenueChange)}% vs previous`,
                  direction: revenueChange >= 0 ? "up" : "down",
                }
              : undefined
          }
        />
        <StatCard
          label="Orders placed"
          value={String(orders.length)}
          icon={ReceiptText}
          tone="violet"
          hint={`${activeOrders.length} not cancelled`}
        />
        <StatCard
          label="Average order"
          value={formatNPR(averageOrder)}
          icon={TrendingUp}
          tone="gold"
          hint="Non-cancelled orders"
        />
        <StatCard
          label="New customers"
          value={String(newCustomers)}
          icon={Users}
          tone="blue"
          hint={`${reservationCount} reservations · ${eventCount} events`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AdminCard className="p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {useMonthly ? "Monthly revenue" : "Daily revenue"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Paid orders only, in NPR. Order counts include unpaid and COD
                orders.
              </p>
            </div>
            <Badge variant="green">
              {formatNPR(chartData.reduce((sum, row) => sum + row.revenue, 0))}
            </Badge>
          </div>
          {orders.length === 0 ? (
            <div className="mt-4 grid h-[260px] place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No orders in this range.
            </div>
          ) : (
            <div className="mt-4">
              <RevenueChart data={chartData} />
            </div>
          )}
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="font-display text-xl font-semibold">Top dishes</h2>
          <p className="text-xs text-muted-foreground">
            By quantity sold in range.
          </p>
          {topDishData.length === 0 ? (
            <div className="mt-4 grid h-[250px] place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No dish sales yet.
            </div>
          ) : (
            <div className="mt-4">
              <TopDishChart data={topDishData} />
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <AdminCard className="p-5">
          <h2 className="font-display text-lg font-semibold">Order mix</h2>
          <ul className="mt-3 space-y-2.5">
            {(["DELIVERY", "PICKUP", "DINE_IN"] as OrderType[]).map((type) => {
              const count = typeTotals.get(type) ?? 0;
              const share = orders.length
                ? Math.round((count / orders.length) * 100)
                : 0;
              return (
                <li key={type}>
                  <div className="flex justify-between text-xs">
                    <span>{ORDER_TYPE_LABELS[type]}</span>
                    <span className="text-muted-foreground">
                      {count} · {share}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="font-display text-lg font-semibold">Payment mix</h2>
          <ul className="mt-3 space-y-2.5">
            {[...paymentTotals.entries()].map(([method, count]) => {
              const share = orders.length
                ? Math.round((count / orders.length) * 100)
                : 0;
              return (
                <li key={method}>
                  <div className="flex justify-between text-xs">
                    <span>
                      {PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method}
                    </span>
                    <span className="text-muted-foreground">
                      {count} · {share}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {paymentTotals.size === 0 ? (
              <li className="text-xs text-muted-foreground">
                No payments in range.
              </li>
            ) : null}
          </ul>
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="font-display text-lg font-semibold">Order status</h2>
          <ul className="mt-3 space-y-2">
            {[...statusTotals.entries()].map(([status, count]) => (
              <li key={status} className="flex justify-between text-xs">
                <span>
                  {STATUS_META[status as OrderStatus]?.label ?? status}
                </span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
            {statusTotals.size === 0 ? (
              <li className="text-xs text-muted-foreground">
                No orders in range.
              </li>
            ) : null}
          </ul>
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="font-display text-lg font-semibold">Paid share</h2>
          <p className="mt-4 font-display text-3xl font-semibold text-primary">
            {orders.length
              ? Math.round((paidOrders.length / orders.length) * 100)
              : 0}
            %
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {paidOrders.length} of {orders.length} orders have verified payment.
            COD orders show as unpaid until staff record collection.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href={`/admin/orders?status=PENDING`}>
              Review pending orders
            </Link>
          </Button>
        </AdminCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Top customers
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/api/admin/reports/customers?${rangeQuery}`}>
                Customers CSV
              </Link>
            </Button>
          </div>
          {topCustomerRows.length === 0 ? (
            <AdminEmpty
              title="No customer spend"
              description="Paid registered-customer orders in this range will appear here."
            />
          ) : (
            <ol className="mt-3 space-y-2">
              {topCustomerRows.map((row, index) => {
                const profile = row.userId ? profileMap.get(row.userId) : null;
                return (
                  <li
                    key={row.userId}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {profile?.name ?? "Customer"}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {profile?.email ?? "—"} · {row._count._all} orders
                      </p>
                    </div>
                    <p className="text-xs font-semibold">
                      {formatNPR(row._sum.total ?? 0)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Delivery zones
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/settings?tab=delivery">Manage zones</Link>
            </Button>
          </div>
          {zoneRows.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
              No delivery orders in this range.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {zoneRows.map((row) => (
                <li
                  key={row.zoneId ?? "none"}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs"
                >
                  <span>{zoneMap.get(row.zoneId ?? "") ?? "Zone removed"}</span>
                  <span className="text-muted-foreground">
                    {row._count._all} orders ·{" "}
                    {formatNPR(row._sum.deliveryFee ?? 0)} fees
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard className="mt-4 p-5">
        <h2 className="font-display text-xl font-semibold">Export centre</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Downloads respect the date range above. Other exports contain their
          own filter state.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: `/api/admin/reports/orders?${rangeQuery}`,
              label: "Orders (date range)",
            },
            {
              href: `/api/admin/reports/customers?${rangeQuery}`,
              label: "Customers (date range)",
            },
            {
              href: `/api/admin/reports/reservations?${rangeQuery}`,
              label: "Reservations (date range)",
            },
            {
              href: `/api/admin/reports/events?${rangeQuery}`,
              label: "Event bookings (date range)",
            },
            {
              href: `/api/admin/reports/audit`,
              label: "Audit log (latest 5,000)",
            },
            {
              href: `/api/admin/reports/summary?${rangeQuery}`,
              label: "Daily revenue summary",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-muted/40"
            >
              {item.label}
              <Download className="size-3.5 text-primary" />
            </Link>
          ))}
        </div>
      </AdminCard>
    </>
  );
}
