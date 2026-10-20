"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState } from "@/components/ui/empty-state";
import { cartCount, cartSubtotal, useCartStore } from "@/lib/cart-store";
import { formatNPR } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";

export function CartSheet() {
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);

  const count = mounted ? cartCount(items) : 0;
  const subtotal = mounted ? cartSubtotal(items) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {count === 0
              ? "Your next delicious thing is waiting."
              : `${count} ${count === 1 ? "item" : "items"} ready for checkout.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!mounted ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex animate-pulse gap-3">
                  <div className="size-20 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <div className="h-4 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Explore momos, curries, pizzas and more from our kitchen."
              actionLabel="Browse the menu"
              actionHref="/menu"
              className="border-0 bg-transparent px-0"
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((item) => (
                <li key={item.lineId} className="flex gap-3 py-4 first:pt-0">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <SmartImage
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                        {item.variantName || item.addOns.length > 0 ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {[
                              item.variantName,
                              ...item.addOns.map((a) => a.name),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem(item.lineId)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {item.instructions ? (
                      <p className="mt-1 line-clamp-1 text-[11px] italic text-muted-foreground">
                        “{item.instructions}”
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border">
                        <button
                          type="button"
                          className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(item.lineId, item.quantity - 1)
                          }
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-7 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(item.lineId, item.quantity + 1)
                          }
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatNPR(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {mounted && items.length > 0 ? (
          <SheetFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-base font-bold">{formatNPR(subtotal)}</span>
            </div>
            <p className="w-full text-left text-xs text-muted-foreground">
              Taxes and delivery are calculated at checkout.
            </p>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={() => setCartOpen(false)}>
                <Link href="/cart">View cart</Link>
              </Button>
              <Button asChild onClick={() => setCartOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
