import {
  ORDER_TYPE_LABELS,
  SITE,
  type OrderType,
} from "@/lib/constants";
import { formatDateTimeShort, parseAddOnNames } from "@/lib/utils";

export type KitchenTicketOrder = {
  orderNumber: string;
  createdAt: Date;
  type: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  tableNumber: string | null;
  notes: string | null;
  scheduledFor: Date | null;
  items: Array<{
    id: string;
    name: string;
    variantName: string | null;
    addOns: string;
    instructions: string | null;
    quantity: number;
  }>;
};

const serviceLabel = (order: KitchenTicketOrder) => {
  if (order.type === "DINE_IN") {
    return order.tableNumber ? `DINE-IN · TABLE ${order.tableNumber}` : "DINE-IN";
  }
  if (order.type === "DELIVERY") return "DELIVERY";
  return "PICKUP";
};

export function KitchenTicket({ order }: { order: KitchenTicketOrder }) {
  return (
    <article
      id="kitchen-ticket"
      className="kot-sheet"
      aria-label={`Kitchen order ticket for ${order.orderNumber}`}
    >
      <header className="kot-header">
        <p className="kot-title">KITCHEN ORDER TICKET</p>
        <p className="kot-order">{order.orderNumber}</p>
        <p>{SITE.shortName} · {SITE.address.line1}</p>
      </header>

      <dl className="kot-meta">
        <div>
          <dt>Service</dt>
          <dd>{serviceLabel(order)}</dd>
        </div>
        <div>
          <dt>{order.scheduledFor ? "Scheduled for" : "Received"}</dt>
          <dd>{formatDateTimeShort(order.scheduledFor ?? order.createdAt)}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{order.customerName}</dd>
        </div>
        <div>
          <dt>Order type</dt>
          <dd>
            {ORDER_TYPE_LABELS[order.type as OrderType] ?? order.type}
          </dd>
        </div>
        {order.type === "DELIVERY" && order.deliveryAddress ? (
          <div className="col-span-2">
            <dt>Delivery address</dt>
            <dd>{order.deliveryAddress}</dd>
          </div>
        ) : null}
      </dl>

      {order.notes ? (
        <p className="kot-instructions">
          <strong>ORDER NOTE:</strong> {order.notes}
        </p>
      ) : null}

      <ul className="kot-items">
        {order.items.map((item) => {
          const addOns = parseAddOnNames(item.addOns);
          return (
            <li key={item.id} className="kot-item">
              <div className="kot-item-head">
                <span className="kot-qty">{item.quantity}</span>
                <span className="kot-name">{item.name}</span>
              </div>
              {item.variantName ? (
                <p className="kot-detail">{item.variantName}</p>
              ) : null}
              {addOns.length > 0 ? (
                <p className="kot-detail">Add-ons: {addOns.join(", ")}</p>
              ) : null}
              {item.instructions ? (
                <p className="kot-instructions">
                  <strong>NOTE:</strong> {item.instructions}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <footer className="kot-footer">
        <p>
          Kitchen copy · {order.orderNumber} ·{" "}
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} item
          {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1
            ? ""
            : "s"}
        </p>
        <p>Not a tax invoice. Please prepare in the order shown.</p>
      </footer>
    </article>
  );
}
