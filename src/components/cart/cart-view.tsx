"use client";

import Link from "next/link";
import {
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SmartImage } from "@/components/ui/smart-image";
import { Separator } from "@/components/ui/separator";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { calculateOrderTotals, formatNPR } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";

export function CartView({
  taxRate,
  serviceChargeRate,
  minDeliveryOrder,
}: {
  taxRate: number;
  serviceChargeRate: number;
  minDeliveryOrder: number;
}) {
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const subtotal = cartSubtotal(items);
  const totals = calculateOrderTotals({
    subtotal,
    taxRate,
    serviceChargeRate,
  });

  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is patiently waiting"
        description="Add something from the kitchen — momos, biryani, pizza or a garden favourite."
        actionLabel="Browse the menu"
        actionHref="/menu"
        actionOnClick={() => setCartOpen(false)}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:items-start">
      <div>
        <div className="flex items-center justify-between border-b pb-4">
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "line" : "lines"} in your cart
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-destructive"
            onClick={() => {
              if (window.confirm("Remove everything from your cart?")) {
                clearCart();
                toast.success("Cart cleared.");
              }
            }}
          >
            <Trash2 className="size-3.5" /> Clear cart
          </button>
        </div>
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.lineId} className="flex gap-4 py-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28">
                <SmartImage
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/menu?category=${encodeURIComponent(
                        item.categoryName?.toLowerCase() ?? "",
                      )}`}
                      className="font-display text-lg font-semibold hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    {item.variantName || item.addOns.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {[
                          item.variantName,
                          ...item.addOns.map((addOn) => addOn.name),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {item.instructions ? (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        “{item.instructions}”
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatNPR(item.unitPrice * item.quantity)}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border">
                    <button
                      type="button"
                      className="grid size-8 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setQuantity(item.lineId, item.quantity - 1)
                      }
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="grid size-8 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setQuantity(item.lineId, item.quantity + 1)
                      }
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.lineId)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/menu">
            <Plus className="size-4" /> Keep browsing
          </Link>
        </Button>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-32">
        <h2 className="font-display text-xl font-semibold">Order summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatNPR(totals.subtotal)}</dd>
          </div>
          {totals.serviceCharge > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Service charge</dt>
              <dd>{formatNPR(totals.serviceCharge)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              Estimated VAT ({taxRate}%)
            </dt>
            <dd>{formatNPR(totals.taxAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-xs text-muted-foreground">
              Calculated at checkout
            </dd>
          </div>
          <Separator />
          <div className="flex justify-between gap-3 text-base font-bold">
            <dt>Estimated total</dt>
            <dd>{formatNPR(totals.total)}</dd>
          </div>
        </dl>
        {minDeliveryOrder > 0 && subtotal < minDeliveryOrder ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Delivery orders start at {formatNPR(minDeliveryOrder)}. Add{" "}
            {formatNPR(minDeliveryOrder - subtotal)} more, or choose pickup.
          </p>
        ) : null}
        <Button asChild size="lg" className="mt-5 w-full">
          <Link href="/checkout">
            Continue to checkout <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Secure checkout · No account required
        </p>
      </aside>
    </div>
  );
}
