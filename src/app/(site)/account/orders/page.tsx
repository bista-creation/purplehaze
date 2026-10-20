import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import {
  ORDER_STATUSES,
  ORDER_TYPE_LABELS,
  STATUS_META,
  type OrderStatus,
  type OrderType,
} from "@/lib/constants";
import { formatNPR } from "@/lib/money";
import { formatDateTime, humanize } from "@/lib/utils";
import { StatusBadge } from "@/components/orders/status-badge";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { ReorderButton } from "@/components/account/reorder-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const typeIcons = { DELIVERY: Truck, PICKUP: ShoppingBag, DINE_IN: Store } as const;

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = ORDER_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : "ALL";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    userId: user.id,
    ...(status !== "ALL" ? { status } : {}),
  };

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countMap = new Map(counts.map((row) => [row.status, row._count._all]));
  const allCount = counts.reduce((sum, row) => sum + row._count._all, 0);
  const tabs = [
    { value: "ALL" as const, label: "All", count: allCount },
    ...ORDER_STATUSES.map((item) => ({
      value: item,
      label: STATUS_META[item].label,
      count: countMap.get(item) ?? 0,
    })),
  ];

  const pageHref = (nextPage: number, nextStatus = status) => {
    const query = new URLSearchParams();
    if (nextStatus !== "ALL") query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/account/orders?${suffix}` : "/account/orders";
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Order history</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">My orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow current orders, download your receipt or build the same cart
            again.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/track">Track guest order</Link>
        </Button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs
          .filter((tab) => tab.count > 0 || tab.value === "ALL")
          .map((tab) => (
            <Link
              key={tab.value}
              href={pageHref(1, tab.value)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                status === tab.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {tab.label}
              <span className="ml-1.5 opacity-60">{tab.count}</span>
            </Link>
          ))}
      </div>

      <div className="mt-5">
        {orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={status === "ALL" ? "No orders yet" : "No orders in this status"}
            description={
              status === "ALL"
                ? "Once you order, everything from the kitchen to your door will live here."
                : "Try another filter to see your other orders."
            }
            actionLabel="Browse the menu"
            actionHref="/menu"
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const TypeIcon = typeIcons[order.type as OrderType] ?? ShoppingBag;
              const itemCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.status} />
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TypeIcon className="size-3.5" />
                          {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-xl font-semibold">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {order.items
                          .slice(0, 4)
                          .map((item) => `${item.quantity} × ${item.name}`)
                          .join(" · ")}
                        {order.items.length > 4 ? " · …" : ""}
                      </p>
                      {order.scheduledFor ? (
                        <p className="mt-1 text-[11px] text-primary">
                          Scheduled for {formatDateTime(order.scheduledFor)}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-xl font-semibold">
                        {formatNPR(order.total)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                        {humanize(order.paymentStatus)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button asChild size="sm">
                      <Link href={`/order/${order.orderNumber}`}>
                        View order
                      </Link>
                    </Button>
                    <ReorderButton orderId={order.id} />
                    <CancelOrderButton
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      token={null}
                      status={order.status}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} orders
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={pageHref(page - 1)} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon"
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={pageHref(page + 1)} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
