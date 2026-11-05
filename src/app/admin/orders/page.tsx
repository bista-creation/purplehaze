import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  Search,
  SlidersHorizontal,
  TestTube2,
  Timer,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { StaffLiveOrderListener } from "@/components/admin/staff-live-order-listener";
import { StaffOrderQuickActions } from "@/components/admin/staff-order-quick-actions";
import { StatusBadge } from "@/components/orders/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";
import { formatNPR } from "@/lib/money";
import { formatDateTime, cn } from "@/lib/utils";
import {
  evaluateOrderAcceptance,
  orderServiceSummary,
  paymentMethodLabel,
  paymentPresentation,
} from "@/lib/order-state";
import {
  realOrderWhere,
  realOrdersWhere,
  testDataControlsVisible,
} from "@/lib/test-data";
import {
  ORDER_STATUSES,
  ORDER_TYPE_LABELS,
  STATUS_META,
  type OrderStatus,
  type OrderType,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const QUEUE_LIMIT = 12;

function waitingLabel(date: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min waiting`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining ? ` ${remaining}m` : ""} waiting`;
}

function waitingTone(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes >= 30) return "red" as const;
  if (minutes >= 15) return "amber" as const;
  return "muted" as const;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type?: string;
    q?: string;
    page?: string;
    test?: string;
    view?: string;
  }>;
}) {
  await requireStaff("/admin/orders");
  const params = await searchParams;
  const status = ORDER_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : "ALL";
  const type = ["DELIVERY", "PICKUP", "DINE_IN"].includes(params.type ?? "")
    ? (params.type as "DELIVERY" | "PICKUP" | "DINE_IN")
    : "ALL";
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const testControlsVisible = testDataControlsVisible();
  const includeTest = testControlsVisible && params.test === "1";

  const filterWhere: Prisma.OrderWhereInput = {
    ...(status !== "ALL" ? { status } : {}),
    ...(type !== "ALL" ? { type } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q } },
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
          ],
        }
      : {}),
  };
  const where = includeTest ? filterWhere : realOrdersWhere(filterWhere);
  const baseWhere = includeTest ? {} : realOrderWhere;
  const queueWhere = includeTest
    ? {
        status: "PENDING",
        OR: [{ paymentMethod: "COD" }, { paymentStatus: "PAID" }],
      }
    : realOrdersWhere({
        status: "PENDING",
        OR: [{ paymentMethod: "COD" }, { paymentStatus: "PAID" }],
      });

  type OrderRow = {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    type: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    createdAt: Date;
    scheduledFor: Date | null;
    isTest: boolean;
  };

  type QueueRow = OrderRow & {
    deliveryAddress: string | null;
    tableNumber: string | null;
    notes: string | null;
  };

  type StatusCountRow = { status: string; _count: { _all: number } };

  let orders: OrderRow[] = [];
  let total = 0;
  let counts: StatusCountRow[] = [];
  let activeCount = 0;
  let pendingCount = 0;
  let queue: QueueRow[] = [];

  try {
    const [o, t, c, a, p, q] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          type: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          createdAt: true,
          scheduledFor: true,
          isTest: true,
        },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: baseWhere,
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "PREPARING",
              "READY",
              "OUT_FOR_DELIVERY",
            ],
          },
        },
      }),
      prisma.order.count({ where: queueWhere }),
      prisma.order.findMany({
        where: queueWhere,
        orderBy: { createdAt: "desc" },
        take: QUEUE_LIMIT,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          type: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          createdAt: true,
          scheduledFor: true,
          deliveryAddress: true,
          tableNumber: true,
          notes: true,
          isTest: true,
        },
      }),
    ]);
    orders = o;
    total = t;
    counts = c;
    activeCount = a;
    pendingCount = p;
    queue = q;
  } catch {
    console.warn("Database offline in AdminOrdersPage; using empty orders queue.");
  }

  // Determine active view: 'needs_action' vs 'all'
  // When pending orders exist and view is unspecified, we guide operators to 'needs_action'
  const activeView =
    params.view === "needs_action"
      ? "needs_action"
      : params.view === "all"
        ? "all"
        : pendingCount > 0
          ? "needs_action"
          : "all";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countMap = new Map(counts.map((row) => [row.status, row._count._all]));
  const allCount = counts.reduce((sum, row) => sum + row._count._all, 0);

  function href(next: {
    view?: string;
    status?: string;
    type?: string;
    q?: string;
    page?: number;
    test?: boolean;
  }) {
    const query = new URLSearchParams();
    const nextView = next.view ?? activeView;
    const nextStatus = next.status ?? status;
    const nextType = next.type ?? type;
    const nextQ = next.q ?? q;
    const nextTest = next.test ?? includeTest;

    if (nextView) query.set("view", nextView);
    if (nextStatus !== "ALL") query.set("status", nextStatus);
    if (nextType !== "ALL") query.set("type", nextType);
    if (nextQ) query.set("q", nextQ);
    if (nextTest) query.set("test", "1");
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/orders?${query}` : "/admin/orders";
  }

  const exportQuery = new URLSearchParams();
  if (status !== "ALL") exportQuery.set("status", status);
  if (type !== "ALL") exportQuery.set("type", type);
  if (q) exportQuery.set("q", q);
  const exportHref = `/api/admin/reports/orders${exportQuery.toString() ? `?${exportQuery}` : ""}`;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <AdminPageHeader
        eyebrow="Service floor"
        title="Orders"
        description={`${allCount} orders all time · ${activeCount} active · ${pendingCount} awaiting acceptance.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={exportHref}>
              <Download className="size-3.5" /> Export CSV
            </Link>
          </Button>
        }
      />

      <StaffLiveOrderListener />

      {/* Primary View Switcher: Prevents Pending Duplication on Mobile */}
      <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
        <Link
          href={href({ view: "needs_action", page: 1 })}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeView === "needs_action"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Timer className="size-3.5" />
          <span>Needs Action</span>
          {pendingCount > 0 ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeView === "needs_action"
                  ? "bg-white text-primary"
                  : "bg-amber-500 text-white",
              )}
            >
              {pendingCount}
            </span>
          ) : null}
        </Link>

        <Link
          href={href({ view: "all", page: 1 })}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeView === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <ClipboardList className="size-3.5" />
          <span>All Orders</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
              activeView === "all"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {allCount}
          </span>
        </Link>
      </div>

      {/* VIEW 1: NEEDS ACTION (Live Acceptance Queue) */}
      {activeView === "needs_action" ? (
        <AdminCard className="mb-4 border-primary/25 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
                <Timer className="size-5 text-primary" /> Live acceptance queue
              </h2>
              <p className="text-xs text-muted-foreground">
                Newest pending orders first. Review payment and address before accepting.
              </p>
            </div>
            <Badge variant="gold" className="w-fit">
              {pendingCount} pending
            </Badge>
          </div>

          {queue.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
              <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
              <p className="mt-2 font-display text-base font-semibold">Kitchen queue is clear</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                No orders are currently waiting for acceptance. New customer orders will chime here in real time.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={href({ view: "all" })}>Browse all orders</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {queue.map((order) => {
                const payment = paymentPresentation(
                  order.paymentMethod,
                  order.paymentStatus,
                );
                const acceptance = evaluateOrderAcceptance(order);
                const service = orderServiceSummary(order);
                return (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-display text-lg font-semibold text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-xs font-medium">
                          {order.customerName} ·{" "}
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-primary hover:underline"
                          >
                            {order.customerPhone}
                          </a>
                        </p>
                      </div>
                      <Badge
                        variant={waitingTone(order.createdAt)}
                        className="gap-1"
                      >
                        <Clock3 className="size-3" />
                        {waitingLabel(order.createdAt)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="violet">
                        {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
                      </Badge>
                      <Badge
                        variant={
                          payment.tone === "muted" ? "muted" : payment.tone
                        }
                      >
                        {payment.label}
                      </Badge>
                      <Badge variant="outline">
                        {paymentMethodLabel(order.paymentMethod)}
                      </Badge>
                      {order.isTest ? <Badge variant="amber">Test</Badge> : null}
                    </div>

                    <p className="mt-3 text-xs font-medium">{service}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatNPR(order.total)}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                      {order.scheduledFor ? (
                        <>
                          <span>·</span>
                          <span>
                            Scheduled {formatDateTime(order.scheduledFor)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {order.notes ? (
                      <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                        “{order.notes}”
                      </p>
                    ) : null}
                    {!acceptance.allowed ? (
                      <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                        {acceptance.reason}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <StaffOrderQuickActions
                        orderId={order.id}
                        orderNumber={order.orderNumber}
                        status={order.status}
                        type={order.type}
                        customerName={order.customerName}
                        customerPhone={order.customerPhone}
                        allowedAccept={acceptance.allowed}
                        blockedReason={
                          acceptance.allowed ? undefined : acceptance.reason
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {pendingCount > queue.length ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Showing the newest {queue.length} of {pendingCount} pending orders.{" "}
              <Link
                href={href({ view: "all", status: "PENDING", page: 1 })}
                className="font-semibold text-primary hover:underline"
              >
                View all pending in orders list
              </Link>
            </p>
          ) : null}
        </AdminCard>
      ) : null}

      {/* VIEW 2: ALL ORDERS (Search, Filters & Master List) */}
      {activeView === "all" ? (
        <>
          {/* Compact & Reachable Search & Filters */}
          <AdminCard className="mb-4 p-3.5 sm:p-4">
            <form
              action="/admin/orders"
              method="GET"
              className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-end"
            >
              <input type="hidden" name="view" value="all" />
              {includeTest ? <input type="hidden" name="test" value="1" /> : null}
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="order-search"
                  className="mb-1 block text-xs font-semibold text-muted-foreground"
                >
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="order-search"
                    name="q"
                    defaultValue={q}
                    placeholder="Order number, customer or phone"
                    className="h-9.5 pl-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                <div>
                  <label
                    htmlFor="order-status-filter"
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Status
                  </label>
                  <select
                    id="order-status-filter"
                    name="status"
                    defaultValue={status}
                    className="h-9.5 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:text-sm"
                  >
                    <option value="ALL">All statuses</option>
                    {ORDER_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {STATUS_META[item].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="order-type-filter"
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Type
                  </label>
                  <select
                    id="order-type-filter"
                    name="type"
                    defaultValue={type}
                    className="h-9.5 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:text-sm"
                  >
                    <option value="ALL">All types</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="DINE_IN">Dine-in</option>
                  </select>
                </div>
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-9.5 shrink-0">
                <SlidersHorizontal className="size-3.5" /> Apply
              </Button>
            </form>

            {/* Smooth Horizontal Scrollable Filter Chips: Eliminates Mobile Overflow */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 -mx-1 px-1">
              <Link
                href={href({ status: "ALL", page: 1 })}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                  status === "ALL"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                )}
              >
                All <span className="opacity-70">{allCount}</span>
              </Link>
              {ORDER_STATUSES.map((item) => (
                <Link
                  key={item}
                  href={href({ status: item, page: 1 })}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                    status === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  {STATUS_META[item].label}{" "}
                  <span className="opacity-70">{countMap.get(item) ?? 0}</span>
                </Link>
              ))}
              {testControlsVisible ? (
                <Link
                  href={href({ test: !includeTest, page: 1 })}
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <TestTube2 className="size-3" />
                  {includeTest ? "Hide test" : "Test orders"}
                </Link>
              ) : null}
            </div>
            {includeTest ? (
              <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                Test orders are visible for local development. They are excluded from dashboard metrics and exports.
              </p>
            ) : null}
          </AdminCard>

          {orders.length === 0 ? (
            <AdminEmpty
              title="No orders match"
              description="Try clearing the filters or search with a different order number or phone."
            >
              <Button asChild variant="outline" size="sm">
                <Link href={href({ status: "ALL", type: "ALL", q: "" })}>Clear filters</Link>
              </Button>
            </AdminEmpty>
          ) : (
            <>
              {/* MOBILE PHONE ORDER CARDS (< md): Highly readable, zero horizontal overflow */}
              <div className="space-y-3 md:hidden">
                {orders.map((order) => {
                  const payment = paymentPresentation(
                    order.paymentMethod,
                    order.paymentStatus,
                  );
                  const acceptance = evaluateOrderAcceptance(order);
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
                    >
                      {/* Top: Order number, time, and status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-display text-base font-bold text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Customer details & Total amount */}
                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {order.customerName}
                          </p>
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="mt-0.5 inline-block text-[11px] text-primary hover:underline"
                          >
                            {order.customerPhone}
                          </a>
                        </div>
                        <p className="text-right font-display text-base font-bold text-foreground">
                          {formatNPR(order.total)}
                        </p>
                      </div>

                      {/* Fulfillment, payment and test badges */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="violet" className="text-[10px]">
                          {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
                        </Badge>
                        <Badge
                          variant={payment.tone === "muted" ? "muted" : payment.tone}
                          className="text-[10px]"
                        >
                          {payment.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {paymentMethodLabel(order.paymentMethod)}
                        </Badge>
                        {order.isTest ? (
                          <Badge variant="amber" className="text-[9px]">
                            Test
                          </Badge>
                        ) : null}
                        {order.scheduledFor ? (
                          <span className="text-[10px] text-muted-foreground">
                            Sched: {formatDateTime(order.scheduledFor)}
                          </span>
                        ) : null}
                      </div>

                      {/* Contextual Next Valid Action */}
                      <div className="mt-3 border-t border-border/50 pt-3">
                        <StaffOrderQuickActions
                          orderId={order.id}
                          orderNumber={order.orderNumber}
                          status={order.status}
                          type={order.type}
                          customerName={order.customerName}
                          customerPhone={order.customerPhone}
                          allowedAccept={acceptance.allowed}
                          blockedReason={
                            acceptance.allowed ? undefined : acceptance.reason
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (>= md): Preserves full high-density desktop tabular layout */}
              <AdminCard className="hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Placed</TableHead>
                        <TableHead className="text-right">Quick Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => {
                        const payment = paymentPresentation(
                          order.paymentMethod,
                          order.paymentStatus,
                        );
                        const acceptance = evaluateOrderAcceptance(order);
                        return (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="font-semibold text-primary hover:underline"
                              >
                                {order.orderNumber}
                              </Link>
                              {order.isTest ? (
                                <p className="mt-1">
                                  <Badge variant="amber" className="text-[9px]">
                                    Test
                                  </Badge>
                                </p>
                              ) : null}
                              {order.scheduledFor ? (
                                <p className="text-[10px] text-muted-foreground">
                                  Scheduled {formatDateTime(order.scheduledFor)}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{order.customerName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {order.customerPhone}
                              </p>
                            </TableCell>
                            <TableCell className="text-xs">
                              {ORDER_TYPE_LABELS[order.type as OrderType] ??
                                order.type}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.tone === "muted" ? "muted" : payment.tone
                                }
                              >
                                {payment.label}
                              </Badge>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {paymentMethodLabel(order.paymentMethod)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatNPR(order.total)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                              {formatDateTime(order.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <StaffOrderQuickActions
                                orderId={order.id}
                                orderNumber={order.orderNumber}
                                status={order.status}
                                type={order.type}
                                customerName={order.customerName}
                                customerPhone={order.customerPhone}
                                allowedAccept={acceptance.allowed}
                                blockedReason={
                                  acceptance.allowed ? undefined : acceptance.reason
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AdminCard>
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} orders
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                >
                  <Link href={href({ page: page - 1 })} aria-label="Previous page">
                    <ChevronLeft className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className={
                    page >= totalPages ? "pointer-events-none opacity-50" : ""
                  }
                >
                  <Link href={href({ page: page + 1 })} aria-label="Next page">
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
