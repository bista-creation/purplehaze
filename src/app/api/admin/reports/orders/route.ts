import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { resolveReportRange } from "@/lib/report-range";
import { formatDateTime } from "@/lib/utils";
import { paisaToRupees } from "@/lib/money";
import { realOrdersWhere } from "@/lib/test-data";
import {
  ORDER_STATUSES,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
} from "@/lib/constants";

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN", "STAFF"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams, { defaultDays: null });
  const status = ORDER_STATUSES.includes(
    searchParams.get("status") as OrderStatus,
  )
    ? (searchParams.get("status") as OrderStatus)
    : null;
  const type = ["DELIVERY", "PICKUP", "DINE_IN"].includes(
    searchParams.get("type") ?? "",
  )
    ? searchParams.get("type")
    : null;
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);

  const orders = await prisma.order.findMany({
    where: realOrdersWhere({
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q } },
            ],
          }
        : {}),
    }),
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      type: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      deliveryFee: true,
      taxAmount: true,
      discountAmount: true,
      total: true,
      couponCode: true,
      deliveryAddress: true,
      tableNumber: true,
      notes: true,
      createdAt: true,
      scheduledFor: true,
      cancelledAt: true,
      cancelReason: true,
      zone: { select: { name: true } },
      items: {
        select: {
          name: true,
          variantName: true,
          quantity: true,
          lineTotal: true,
        },
      },
      payments: {
        select: { provider: true, status: true, transactionId: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.orders",
    entity: "Order",
    details: {
      rows: orders.length,
      status,
      type,
      q: q || null,
      range,
    },
  });

  const body = toCsv(
    [
      { key: "orderNumber", label: "Order number" },
      { key: "createdAt", label: "Placed (Nepal)" },
      { key: "customerName", label: "Customer" },
      { key: "customerPhone", label: "Phone" },
      { key: "customerEmail", label: "Email" },
      { key: "type", label: "Order type" },
      { key: "status", label: "Status" },
      { key: "paymentStatus", label: "Payment status" },
      { key: "paymentMethod", label: "Payment method" },
      { key: "subtotalNpr", label: "Subtotal NPR" },
      { key: "deliveryFeeNpr", label: "Delivery fee NPR" },
      { key: "taxNpr", label: "Tax NPR" },
      { key: "discountNpr", label: "Discount NPR" },
      { key: "totalNpr", label: "Total NPR" },
      { key: "couponCode", label: "Coupon" },
      { key: "zone", label: "Delivery zone" },
      { key: "deliveryAddress", label: "Delivery address" },
      { key: "tableNumber", label: "Table" },
      { key: "scheduledFor", label: "Scheduled for" },
      { key: "items", label: "Items" },
      { key: "notes", label: "Customer note" },
      { key: "cancelledAt", label: "Cancelled at" },
      { key: "cancelReason", label: "Cancellation reason" },
      { key: "transactionId", label: "Payment transaction" },
    ],
    orders.map((order) => ({
      orderNumber: order.orderNumber,
      createdAt: formatDateTime(order.createdAt),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      type: ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod:
        PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ??
        order.paymentMethod,
      subtotalNpr: paisaToRupees(order.subtotal).toFixed(2),
      deliveryFeeNpr: paisaToRupees(order.deliveryFee).toFixed(2),
      taxNpr: paisaToRupees(order.taxAmount).toFixed(2),
      discountNpr: paisaToRupees(order.discountAmount).toFixed(2),
      totalNpr: paisaToRupees(order.total).toFixed(2),
      couponCode: order.couponCode,
      zone: order.zone?.name ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      tableNumber: order.tableNumber ?? "",
      scheduledFor: order.scheduledFor
        ? formatDateTime(order.scheduledFor)
        : "",
      items: order.items
        .map(
          (item) =>
            `${item.quantity}× ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`,
        )
        .join("; "),
      notes: order.notes ?? "",
      cancelledAt: order.cancelledAt ? formatDateTime(order.cancelledAt) : "",
      cancelReason: order.cancelReason ?? "",
      transactionId: order.payments[0]?.transactionId ?? "",
    })),
  );

  const suffix = range ? `-${range.fromDay}-to-${range.toDay}` : "";
  return csvResponse(`purple-haze-orders${suffix}.csv`, body);
}
