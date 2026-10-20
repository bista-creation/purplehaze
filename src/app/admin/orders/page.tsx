import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
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
import { LiveOrderActions } from "@/components/admin/live-order-actions";
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
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q } },
          ],
        }
      : {}),
  };
  const where = includeTest ? filterWhere : realOrdersWhere(filterWhere);
  const baseWhere = includeTest ? {} : realOrderWhere;
  const queueWhere = includeTest
    ? { status: "PENDING" }
    : realOrdersWhere({ status: "PENDING" });

  const [orders, total, counts, activeCount, pendingCount, queue] =
    await Promise.all([
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countMap = new Map(counts.map((row) => [row.status, row._count._all]));
  const allCount = counts.reduce((sum, row) => sum + row._count._all, 0);

  function href(next: {
    status?: string;
    type?: string;
    q?: string;
    page?: number;
    test?: boolean;
  }) {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextType = next.type ?? type;
    const nextQ = next.q ?? q;
    const nextTest = next.test ?? includeTest;
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
    <>
      <AdminPageHeader
        eyebrow="Service floor"
        title="Orders"
        description={`${allCount} orders all time · ${activeCount} active · ${pendingCount} awaiting acceptance. The live connection status is shown in the header.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={exportHref}>
                <Download className="size-3.5" /> Export CSV
              </Link>
            </Button>
          </>
        }
      />

      <AdminCard className="mb-4 border-primary/25 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Timer className="size-5 text-primary" /> Live acceptance queue
            </h2>
            <p className="text-xs text-muted-foreground">
              Newest pending orders first. Review payment and service details
              before accepting.
            </p>
          </div>
          <Badge variant="gold" className="w-fit">
            {pendingCount} pending
          </Badge>
        </div>

        {queue.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
            No pending orders. New orders will appear here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 xl:grid-cols-2">
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
                        {order.customerName}
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
                    <LiveOrderActions
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      serviceSummary={service}
                      paymentLabel={payment.label}
                      paymentDetail={payment.detail}
                      totalLabel={formatNPR(order.total)}
                      cashDue={payment.isCashDue}
                      allowed={acceptance.allowed}
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
              href={href({ status: "PENDING", page: 1 })}
              className="font-semibold text-primary hover:underline"
            >
              View all pending
            </Link>
          </p>
        ) : null}
      </AdminCard>

      <AdminCard className="mb-4 p-4">
        <form
          action="/admin/orders"
          method="GET"
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
        >
          {includeTest ? <input type="hidden" name="test" value="1" /> : null}
          <div className="min-w-0 flex-1">
            <label
              htmlFor="order-search"
              className="mb-1.5 block text-xs font-semibold"
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
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div>
              <label
                htmlFor="order-status-filter"
                className="mb-1.5 block text-xs font-semibold"
              >
                Status
              </label>
              <select
                id="order-status-filter"
                name="status"
                defaultValue={status}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
                className="mb-1.5 block text-xs font-semibold"
              >
                Type
              </label>
              <select
                id="order-type-filter"
                name="type"
                defaultValue={type}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">All types</option>
                <option value="DELIVERY">Delivery</option>
                <option value="PICKUP">Pickup</option>
                <option value="DINE_IN">Dine-in</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline">
            <SlidersHorizontal className="size-4" /> Apply
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Link
            href={href({ status: "ALL", page: 1 })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
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
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
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
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <TestTube2 className="size-3.5" />
              {includeTest ? "Hide test orders" : "Show test orders"}
            </Link>
          ) : null}
        </div>
        {includeTest ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            Test orders are visible for local development. They are excluded
            from dashboard metrics, reports and CSV exports.
          </p>
        ) : null}
      </AdminCard>

      {orders.length === 0 ? (
        <AdminEmpty
          title="No orders match"
          description="Try clearing the filters or search with a different order number or phone."
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">Clear filters</Link>
          </Button>
        </AdminEmpty>
      ) : (
        <AdminCard className="overflow-hidden">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const payment = paymentPresentation(
                    order.paymentMethod,
                    order.paymentStatus,
                  );
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </AdminCard>
      )}

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
  );
}
