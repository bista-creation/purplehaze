import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Store,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  markOrderPaidAction,
  markOrderRefundedAction,
} from "@/actions/admin/orders";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AcceptOrderPanel } from "@/components/admin/accept-order-panel";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderPrintActions } from "@/components/print/order-print-actions";
import { StatusBadge } from "@/components/orders/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import {
  evaluateOrderAcceptance,
  isOnlinePaymentMethod,
  orderServiceSummary,
  paymentPresentation,
} from "@/lib/order-state";
import { formatDateTime, parseAddOnNames } from "@/lib/utils";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  SITE,
  type OrderType,
  type PaymentMethod,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

const typeIcons = { DELIVERY: Truck, PICKUP: Store, DINE_IN: Store } as const;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff("/admin/orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      coupon: true,
      zone: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!order) notFound();

  const TypeIcon = typeIcons[order.type as OrderType] ?? ReceiptText;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const payment = paymentPresentation(order.paymentMethod, order.paymentStatus);
  const acceptance = evaluateOrderAcceptance(order);
  const serviceSummary = orderServiceSummary(order);

  return (
    <>
      <AdminPageHeader
        eyebrow="Order detail"
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)} · ${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatNPR(order.total)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="no-print">
              <Link href="/admin/orders">
                <ArrowLeft className="size-4" /> Back to orders
              </Link>
            </Button>
            <OrderPrintActions
              orderNumber={order.orderNumber}
              kot={user.role === "ADMIN"}
              className="no-print"
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <Badge variant={payment.tone === "muted" ? "muted" : payment.tone}>
          <Wallet className="size-3" /> {payment.label}
        </Badge>
        <Badge variant="violet">
          <TypeIcon className="size-3" />{" "}
          {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
        </Badge>
        {order.scheduledFor ? (
          <Badge variant="amber">
            <CalendarClock className="size-3" /> Scheduled{" "}
            {formatDateTime(order.scheduledFor)}
          </Badge>
        ) : null}
        {order.tableNumber ? (
          <Badge variant="muted">Table {order.tableNumber}</Badge>
        ) : null}
        {order.status === "CANCELLED" && order.paymentStatus === "PAID" ? (
          <Badge variant="red">Refund required</Badge>
        ) : null}
        {order.isTest ? <Badge variant="amber">Test order</Badge> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <AdminCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <ReceiptText className="size-5 text-primary" /> Items
              </h2>
              <span className="text-xs text-muted-foreground">
                {itemCount} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const addOns = parseAddOnNames(item.addOns);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.name}</p>
                          {item.variantName ? (
                            <p className="text-[11px] text-muted-foreground">
                              {item.variantName}
                            </p>
                          ) : null}
                          {addOns.length > 0 ? (
                            <p className="text-[11px] text-muted-foreground">
                              Add-ons: {addOns.join(", ")}
                            </p>
                          ) : null}
                          {item.instructions ? (
                            <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                              “{item.instructions}”
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatNPR(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNPR(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-border/70 px-5 py-4">
              <dl className="ml-auto max-w-xs space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatNPR(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>{formatNPR(order.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{formatNPR(order.taxAmount)}</dd>
                </div>
                {order.discountAmount > 0 ? (
                  <div className="flex justify-between gap-3 text-emerald-700">
                    <dt>
                      Discount {order.couponCode ? `(${order.couponCode})` : ""}
                    </dt>
                    <dd>-{formatNPR(order.discountAmount)}</dd>
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between gap-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatNPR(order.total)}</dd>
                </div>
              </dl>
            </div>
          </AdminCard>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminCard className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <UserRound className="size-4 text-primary" /> Customer
              </h2>
              <p className="mt-3 font-medium">{order.customerName}</p>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <a
                  href={`tel:${order.customerPhone}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <Phone className="size-3.5" /> {order.customerPhone}
                </a>
                {order.customerEmail ? (
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <Mail className="size-3.5" /> {order.customerEmail}
                  </a>
                ) : null}
                {order.user ? (
                  <Link
                    href={`/admin/customers?q=${encodeURIComponent(order.user.email)}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <UserRound className="size-3.5" /> Registered account
                  </Link>
                ) : (
                  <p className="flex items-center gap-2">
                    <UserRound className="size-3.5" /> Guest checkout
                  </p>
                )}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-4 no-print"
              >
                <a href={`tel:${order.customerPhone}`}>
                  <Phone className="size-3.5" /> Call customer
                </a>
              </Button>
            </AdminCard>

            <AdminCard className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <MapPin className="size-4 text-primary" />{" "}
                {order.type === "DELIVERY"
                  ? "Delivery details"
                  : "Service details"}
              </h2>
              <div className="mt-3 text-xs leading-6 text-muted-foreground">
                {order.type === "DELIVERY" ? (
                  <>
                    <p className="text-sm text-foreground">
                      {order.deliveryAddress}
                    </p>
                    {order.zone ? <p>{order.zone.name} delivery zone</p> : null}
                  </>
                ) : order.type === "PICKUP" ? (
                  <p>Customer pickup from {SITE.address.line1}.</p>
                ) : (
                  <p>
                    Dine-in service
                    {order.tableNumber ? ` · table ${order.tableNumber}` : ""}.
                  </p>
                )}
                {order.notes ? (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                    <span className="font-semibold">Customer note:</span>{" "}
                    {order.notes}
                  </div>
                ) : null}
                {order.cancelReason ? (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-[11px] leading-5 text-red-950 dark:bg-red-950/40 dark:text-red-100">
                    <span className="font-semibold">Cancellation:</span>{" "}
                    {order.cancelReason}
                  </div>
                ) : null}
              </div>
            </AdminCard>
          </div>

          <AdminCard className="p-5">
            <h2 className="font-display text-xl font-semibold">
              Status timeline
            </h2>
            <div className="mt-5">
              <OrderTimeline
                status={order.status}
                type={order.type}
                history={order.statusHistory.map((entry) => ({
                  status: entry.status,
                  note: entry.note,
                  createdAt: entry.createdAt,
                }))}
              />
            </div>
            <div className="mt-5 border-t border-border/70 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audit trail
              </h3>
              <ul className="mt-2 space-y-1.5">
                {order.statusHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline gap-2 text-[11px] text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {entry.status}
                    </span>
                    <span>{formatDateTime(entry.createdAt)}</span>
                    {entry.changedBy ? <span>by {entry.changedBy}</span> : null}
                    {entry.note ? (
                      <span className="w-full pl-0.5">{entry.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-4">
          {order.status === "PENDING" ? (
            <AdminCard className="border-primary/30 p-5 no-print">
              <h2 className="font-display text-xl font-semibold">
                Accept order
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Review this order before starting preparation.
              </p>
              <dl className="mt-4 space-y-2 rounded-xl bg-muted/60 p-3 text-[11px] leading-5">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Order</dt>
                  <dd className="font-semibold">{order.orderNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Service</dt>
                  <dd className="text-right font-medium">{serviceSummary}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold">{formatNPR(order.total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="text-right font-semibold">{payment.label}</dd>
                </div>
                {order.scheduledFor ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Scheduled</dt>
                    <dd className="text-right font-medium">
                      {formatDateTime(order.scheduledFor)}
                    </dd>
                  </div>
                ) : null}
                {order.type === "DELIVERY" && order.deliveryAddress ? (
                  <div>
                    <dt className="text-muted-foreground">Deliver to</dt>
                    <dd className="mt-0.5 font-medium">
                      {order.deliveryAddress}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-3">
                <AcceptOrderPanel
                  orderId={order.id}
                  allowed={acceptance.allowed}
                  reason={acceptance.allowed ? undefined : acceptance.reason}
                  paymentLabel={payment.label}
                  paymentDetail={payment.detail}
                  cashDue={payment.isCashDue}
                  serviceSummary={serviceSummary}
                  totalLabel={formatNPR(order.total)}
                />
              </div>
            </AdminCard>
          ) : null}

          <AdminCard className="p-5 no-print">
            <h2 className="font-display text-xl font-semibold">Update order</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Follow the service flow. Customers receive an email after each
              change.
            </p>
            <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          </AdminCard>

          <AdminCard className="p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <CreditCard className="size-5 text-primary" /> Payment
            </h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_LABELS[
                    order.paymentMethod as PaymentMethod
                  ] ?? order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold">{payment.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatNPR(order.total)}</span>
              </div>
              <p className="rounded-lg bg-muted/60 p-2.5 text-[10px] leading-5 text-muted-foreground">
                {payment.detail}
              </p>
              {order.status === "CANCELLED" &&
              order.paymentStatus === "PAID" ? (
                <p className="rounded-lg bg-red-50 p-2.5 text-[10px] leading-5 text-red-950 dark:bg-red-950/40 dark:text-red-100">
                  The order is cancelled but the payment is still marked paid.
                  Complete the refund in eSewa/Khalti or at the counter, then an
                  admin must record it below.
                </p>
              ) : null}
            </div>

            {order.payments.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-border/70 pt-3">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="text-[10px] leading-5 text-muted-foreground"
                  >
                    <p>
                      <span className="font-semibold text-foreground">
                        {payment.provider}
                      </span>{" "}
                      · {payment.status} · {formatNPR(payment.amount)}
                    </p>
                    <p>
                      {payment.transactionId ?? "No transaction ID"} ·{" "}
                      {formatDateTime(payment.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 no-print">
              {order.paymentStatus !== "PAID" &&
              order.status !== "CANCELLED" &&
              order.paymentMethod === "COD" ? (
                <ConfirmActionButton
                  action={markOrderPaidAction.bind(
                    null,
                    order.id,
                    "Cash payment received by the restaurant team.",
                  )}
                  label="Record cash received"
                  title="Mark this cash order paid?"
                  description="Only do this after collecting the cash. This records the payment in the dashboard; it does not charge the customer."
                  confirmLabel="Yes, cash received"
                  variant="outline"
                  icon={false}
                />
              ) : null}
              {order.paymentStatus !== "PAID" &&
              order.status !== "CANCELLED" &&
              isOnlinePaymentMethod(order.paymentMethod) ? (
                <p className="rounded-lg border border-amber-300/70 bg-amber-50 p-2.5 text-[10px] leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  Online payment must be verified by eSewa/Khalti. Do not mark
                  this order paid manually. Ask the customer to recheck payment
                  if the provider callback is delayed.
                </p>
              ) : null}
              {order.paymentStatus === "PAID" &&
              order.status === "CANCELLED" &&
              user.role === "ADMIN" ? (
                <ConfirmActionButton
                  action={markOrderRefundedAction.bind(
                    null,
                    order.id,
                    "Refund completed by the restaurant team.",
                  )}
                  label="Record a refund"
                  title="Record a completed refund?"
                  description="Confirm that you have already returned the money in eSewa/Khalti or at the counter. This records the completed refund in the dashboard."
                  confirmLabel="Refund completed"
                  variant="outline"
                  icon={false}
                />
              ) : null}
              {order.paymentStatus === "PAID" ? (
                <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2.5 text-[10px] leading-5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  {payment.detail} Keep the transaction ID on file for
                  reconciliation.
                </p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="p-5">
            <h2 className="font-display text-xl font-semibold">
              Order metadata
            </h2>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Internal ID</dt>
                <dd className="flex items-center gap-1 font-mono">
                  {order.id.slice(-8)}
                  <Copy className="size-3 text-muted-foreground" />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Guest token</dt>
                <dd>{order.publicToken ? "Issued" : "None"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDateTime(order.updatedAt)}</dd>
              </div>
              {order.acceptedAt ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Accepted</dt>
                  <dd>{formatDateTime(order.acceptedAt)}</dd>
                </div>
              ) : null}
              {order.acceptedBy ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Accepted by</dt>
                  <dd className="max-w-[60%] text-right">{order.acceptedBy}</dd>
                </div>
              ) : null}
              {order.isTest ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Data type</dt>
                  <dd className="font-semibold text-amber-700 dark:text-amber-300">
                    Test record
                  </dd>
                </div>
              ) : null}
              {order.coupon ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Coupon</dt>
                  <dd>{order.coupon.code}</dd>
                </div>
              ) : null}
            </dl>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-4 w-full no-print"
            >
              <Link href={`/admin/orders?q=${order.customerPhone}`}>
                Other orders by phone
              </Link>
            </Button>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
