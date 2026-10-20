import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/security";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  SITE,
  type OrderType,
  type PaymentMethod,
} from "@/lib/constants";
import { formatNPR } from "@/lib/money";
import { paymentModeForDisplay } from "@/lib/payments";
import { formatDateTime, parseAddOnNames } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { StatusPoller } from "@/components/orders/status-poller";
import { PaymentPanel } from "@/components/orders/payment-panel";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { OrderSuccess } from "@/components/orders/order-success";
import { OrderPrintActions } from "@/components/print/order-print-actions";
import { ReviewForm } from "@/components/orders/review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

const typeIcon = {
  DELIVERY: Truck,
  PICKUP: ShoppingBag,
  DINE_IN: Store,
} as const;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    token?: string;
    payment?: string;
    reason?: string;
    placed?: string;
  }>;
}) {
  const { orderNumber } = await params;
  const { token, payment, reason, placed } = await searchParams;
  const [user, order] = await Promise.all([
    getCurrentUser(),
    prisma.order.findUnique({
      where: { orderNumber: decodeURIComponent(orderNumber) },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        review: true,
        zone: true,
      },
    }),
  ]);

  if (!order) notFound();

  const tokenAuthorized = Boolean(token && token === order.publicToken);
  const ownerAuthorized = Boolean(user && order.userId === user.id);
  if (!tokenAuthorized && !ownerAuthorized) notFound();

  const active = !["COMPLETED", "CANCELLED"].includes(order.status);
  const TypeIcon = typeIcon[order.type as OrderType] ?? ShoppingBag;
  const paymentNotice =
    payment === "success" && order.paymentStatus === "PAID"
      ? {
          tone: "success" as const,
          title: "Payment received",
          copy: "Your payment was verified. Your order is with our team.",
        }
      : payment === "failed"
        ? {
            tone: "danger" as const,
            title: "Payment not completed",
            copy:
              reason ||
              "The payment was cancelled or could not be verified. You can try again below or call us.",
          }
        : payment === "pending"
          ? {
              tone: "warning" as const,
              title: "Payment confirmation pending",
              copy:
                reason ||
                "If money has left your wallet, please wait a minute and refresh this page.",
            }
          : payment === "unavailable"
            ? {
                tone: "warning" as const,
                title: "Online payment unavailable",
                copy:
                  reason ||
                  "Online payment is not available right now. Please choose cash or call the restaurant.",
              }
            : null;

  const paymentSuccessful =
    payment === "success" && order.paymentStatus === "PAID";
  const justPlaced =
    (placed === "1" || payment === "success") && order.status !== "CANCELLED";
  const receiptToken = tokenAuthorized ? order.publicToken : null;
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ??
    order.paymentMethod;

  return (
    <section className="container-page max-w-6xl py-10 lg:py-14">
      <StatusPoller active={active} />
      {justPlaced ? (
        <OrderSuccess
          orderNumber={order.orderNumber}
          mode={paymentSuccessful ? "paid" : "placed"}
          total={formatNPR(order.total)}
          scheduledFor={
            order.scheduledFor ? formatDateTime(order.scheduledFor) : null
          }
        />
      ) : null}
      {paymentNotice ? (
        <div
          className={
            paymentNotice.tone === "success"
              ? "mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              : paymentNotice.tone === "danger"
                ? "mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                : "mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          }
          role="status"
        >
          {paymentNotice.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          ) : paymentNotice.tone === "danger" ? (
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
          ) : (
            <Clock3 className="mt-0.5 size-5 shrink-0" />
          )}
          <div>
            <p className="font-semibold">{paymentNotice.title}</p>
            <p className="mt-0.5 text-xs leading-5 opacity-80">
              {paymentNotice.copy}
            </p>
          </div>
        </div>
      ) : null}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to menu
        </Link>
        <div className="flex items-center gap-2">
          <CancelOrderButton
            orderId={order.id}
            orderNumber={order.orderNumber}
            token={token ?? null}
            status={order.status}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div
              className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/8 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  {order.scheduledFor ? (
                    <Badge variant="outline" className="gap-1">
                      <CalendarClock className="size-3" /> Scheduled
                    </Badge>
                  ) : null}
                </div>
                <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
                  {order.status === "COMPLETED"
                    ? "Thank you for dining with us."
                    : order.status === "CANCELLED"
                      ? "This order was cancelled."
                      : "We have your order."}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Order{" "}
                  <span className="font-semibold text-foreground">
                    {order.orderNumber}
                  </span>{" "}
                  · Placed {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/60 px-4 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Total
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {formatNPR(order.total)}
                </p>
              </div>
            </div>
            <Separator className="my-5" />
            <div className="relative grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <TypeIcon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Order type</p>
                  <p className="text-sm font-medium">
                    {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {order.type === "DELIVERY"
                      ? "Deliver to"
                      : order.type === "DINE_IN"
                        ? "Table"
                        : "Collect from"}
                  </p>
                  <p className="line-clamp-2 text-sm font-medium">
                    {order.type === "DELIVERY"
                      ? order.deliveryAddress
                      : order.type === "DINE_IN"
                        ? order.tableNumber
                        : SITE.address.line1}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium">{order.customerPhone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                Order progress
              </h2>
              {active ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Live updates
                </span>
              ) : null}
            </div>
            <div className="mt-5">
              <OrderTimeline
                status={order.status}
                type={order.type}
                history={order.statusHistory}
              />
            </div>
          </div>

          <div
            id="receipt"
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ReceiptText className="size-4 text-primary" />
                  <h2 className="font-display text-xl font-semibold">
                    Your receipt
                  </h2>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {SITE.name} · {SITE.address.line1}, {SITE.address.line2} ·{" "}
                  {SITE.phone}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{paymentMethodLabel}</Badge>
                  <Badge
                    variant={
                      order.paymentStatus === "PAID"
                        ? "green"
                        : order.paymentStatus === "INITIATED"
                          ? "amber"
                          : "outline"
                    }
                  >
                    {order.paymentStatus === "PAID"
                      ? "Paid"
                      : order.paymentStatus === "INITIATED"
                        ? "Payment pending"
                        : "Payment due"}
                  </Badge>
                </div>
              </div>
              <OrderPrintActions
                orderNumber={order.orderNumber}
                token={receiptToken}
                className="no-print"
              />
            </div>
            <ul className="mt-5 divide-y">
              {order.items.map((item) => {
                const addOns = parseAddOnNames(item.addOns);
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground">
                          {item.quantity} ×{" "}
                        </span>
                        {item.name}
                      </p>
                      {item.variantName || addOns.length > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[item.variantName, ...addOns]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {item.instructions ? (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          “{item.instructions}”
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatNPR(item.lineTotal)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <Separator className="my-4" />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatNPR(order.subtotal)}</dd>
              </div>
              {order.discountAmount > 0 ? (
                <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                  <dt>
                    Discount {order.couponCode ? `(${order.couponCode})` : ""}
                  </dt>
                  <dd>-{formatNPR(order.discountAmount)}</dd>
                </div>
              ) : null}
              {order.deliveryFee > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>{formatNPR(order.deliveryFee)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">VAT</dt>
                <dd>{formatNPR(order.taxAmount)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between gap-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatNPR(order.total)}</dd>
              </div>
            </dl>
            {order.notes ? (
              <div className="mt-5 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Order note:
                </span>{" "}
                {order.notes}
              </div>
            ) : null}
          </div>

          {order.status === "COMPLETED" && !order.review ? (
            <div className="no-print rounded-2xl border border-border bg-card p-6">
              <p className="eyebrow">One last thing</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                How did we do?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your feedback helps our kitchen and our team.
              </p>
              <div className="mt-5">
                <ReviewForm orderId={order.id} token={order.publicToken} />
              </div>
            </div>
          ) : null}

          {order.review ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <p className="font-semibold">
                  Your {order.review.rating}-star review was submitted.
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 opacity-80">
                {order.review.isApproved
                  ? "It is now visible to other guests."
                  : "It is waiting for approval by our team."}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32">
          <PaymentPanel
            orderId={order.id}
            orderNumber={order.orderNumber}
            token={order.publicToken}
            method={order.paymentMethod}
            paymentStatus={order.paymentStatus}
            amount={order.total}
            paymentMode={paymentModeForDisplay()}
          />

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Need a hand?</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Our team can help with changes, allergies or payment questions.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <a href={`tel:${SITE.phoneRaw}`}>
                  <Phone className="size-4" /> {SITE.phone}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <a
                  href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
                    `Hello Purple Haze, I need help with order ${order.orderNumber}.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> WhatsApp us
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border p-5 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">
              Keep this link handy
            </p>
            <p className="mt-1">
              Use this page to follow updates. For privacy, do not share it
              publicly.
            </p>
            <Button asChild variant="link" size="sm" className="mt-2 px-0">
              <Link href="/track">Track another order</Link>
            </Button>
          </div>
        </aside>
      </div>

      <div className="print-only mt-8 text-xs text-muted-foreground">
        Purple Haze Restro &amp; Garden · {SITE.address.line1},{" "}
        {SITE.address.line2} · {SITE.phone} · Thank you for your order.
      </div>
    </section>
  );
}
