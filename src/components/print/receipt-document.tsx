import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  SITE,
  type OrderType,
  type PaymentMethod,
} from "@/lib/constants";
import { formatNPR } from "@/lib/money";
import { formatDateTime, humanize, parseAddOnNames } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type ReceiptOrder = {
  orderNumber: string;
  createdAt: Date;
  type: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string | null;
  tableNumber: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  couponCode: string | null;
  notes: string | null;
  scheduledFor: Date | null;
  items: Array<{
    id: string;
    name: string;
    variantName: string | null;
    addOns: string;
    instructions: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
};

const paymentStatusLabel = (status: string) => {
  if (status === "UNPAID") return "PAYMENT DUE";
  if (status === "INITIATED") return "PAYMENT PENDING";
  return status;
};

const serviceDescription = (order: ReceiptOrder) => {
  if (order.type === "DELIVERY") {
    return order.deliveryAddress ?? "Delivery address not recorded";
  }
  if (order.type === "DINE_IN") {
    return order.tableNumber ? `Table ${order.tableNumber}` : "Dine-in";
  }
  return "Pickup from the restaurant";
};

export function ReceiptDocument({
  order,
  variant = "a4",
  id,
}: {
  order: ReceiptOrder;
  variant?: "a4" | "thermal" | "screen";
  id?: string;
}) {
  const paperClass =
    variant === "thermal"
      ? "receipt-thermal"
      : variant === "screen"
        ? "receipt-screen"
        : "receipt-a4";
  const cancelled = order.status === "CANCELLED";

  return (
    <article
      id={id}
      className={cn("receipt-document", paperClass)}
      aria-label={`Receipt for order ${order.orderNumber}`}
    >
      <header className="receipt-brand">
        <p className="receipt-brand-name">{SITE.name}</p>
        <p>
          {SITE.address.line1}, {SITE.address.line2}
        </p>
        <p>
          {SITE.address.state}, {SITE.address.country}
        </p>
        <p>
          {SITE.phone} · {SITE.email}
        </p>
      </header>

      {cancelled ? (
        <p className="receipt-cancelled">Cancelled order</p>
      ) : null}

      <dl className="receipt-meta">
        <dt>Receipt</dt>
        <dd>{order.orderNumber}</dd>
        <dt>Placed</dt>
        <dd>{formatDateTime(order.createdAt)}</dd>
        {order.scheduledFor ? (
          <>
            <dt>Scheduled</dt>
            <dd>{formatDateTime(order.scheduledFor)}</dd>
          </>
        ) : null}
        <dt>Service</dt>
        <dd>
          {ORDER_TYPE_LABELS[order.type as OrderType] ?? humanize(order.type)}
        </dd>
        <dt>Customer</dt>
        <dd>{order.customerName}</dd>
        <dt>Phone</dt>
        <dd>{order.customerPhone}</dd>
        <dt>{order.type === "DELIVERY" ? "Address" : "Details"}</dt>
        <dd>{serviceDescription(order)}</dd>
      </dl>

      <table className="receipt-items">
        <thead>
          <tr>
            <th scope="col">Qty</th>
            <th scope="col">Item</th>
            <th scope="col" className="receipt-amount">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const addOns = parseAddOnNames(item.addOns);
            return (
              <tr key={item.id}>
                <td>{item.quantity}</td>
                <td>
                  {item.name}
                  {item.variantName ? (
                    <span className="receipt-item-variant">
                      {item.variantName}
                    </span>
                  ) : null}
                  {addOns.length > 0 ? (
                    <span className="receipt-item-variant">
                      Add-ons: {addOns.join(", ")}
                    </span>
                  ) : null}
                  {item.instructions ? (
                    <span className="receipt-item-note">
                      “{item.instructions}”
                    </span>
                  ) : null}
                </td>
                <td className="receipt-amount">{formatNPR(item.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="receipt-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatNPR(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 ? (
          <div>
            <span>
              Discount{order.couponCode ? ` (${order.couponCode})` : ""}
            </span>
            <span>-{formatNPR(order.discountAmount)}</span>
          </div>
        ) : null}
        {order.deliveryFee > 0 ? (
          <div>
            <span>Delivery</span>
            <span>{formatNPR(order.deliveryFee)}</span>
          </div>
        ) : null}
        <div>
          <span>VAT</span>
          <span>{formatNPR(order.taxAmount)}</span>
        </div>
        <div className="receipt-grand-total">
          <span>Total</span>
          <span>{formatNPR(order.total)}</span>
        </div>
      </div>

      <div className="receipt-payment">
        <span>
          {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ??
            order.paymentMethod}
        </span>
        <span>{paymentStatusLabel(order.paymentStatus)}</span>
      </div>

      {order.notes ? (
        <p className="receipt-notes">
          <strong>Order note:</strong> {order.notes}
        </p>
      ) : null}

      <footer className="receipt-footer">
        <strong>Thank you for choosing Purple Haze.</strong>
        <span>
          Questions? Call {SITE.phone}. Prices are in Nepalese rupees.
        </span>
      </footer>
    </article>
  );
}
