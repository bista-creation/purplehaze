"use client";

import { useState } from "react";
import { Flame, Leaf, Minus, Plus, ShoppingBag, SlidersHorizontal, Timer } from "lucide-react";
import { toast } from "sonner";
import { FavoriteToggleButton } from "@/components/account/favorite-toggle-button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { Textarea } from "@/components/ui/textarea";
import { cartCount, useCartStore } from "@/lib/cart-store";
import { formatNPR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MenuDish } from "@/types";

export function DishCard({
  dish,
  initialFavorited = false,
}: {
  dish: MenuDish;
  initialFavorited?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const defaultVariant =
    dish.variants.find((variant) => variant.isDefault) ?? dish.variants[0];
  const displayPrice = dish.price + (defaultVariant?.priceDelta ?? 0);
  const hasVariants =
    dish.variants.length > 1 ||
    (dish.variants.length === 1 && dish.variants[0].name.toLowerCase() !== "regular");

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_40px_-32px_rgba(76,29,149,0.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(76,29,149,0.4)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative aspect-[4/3] w-full overflow-hidden bg-muted text-left"
          aria-label={`View and add ${dish.name}`}
        >
          <SmartImage
            src={dish.image}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <div className="flex flex-wrap gap-1.5">
              {dish.isFeatured ? (
                <Badge variant="gold" className="backdrop-blur">
                  Popular
                </Badge>
              ) : null}
              {dish.isSpicy ? (
                <Badge variant="red" className="gap-1 backdrop-blur">
                  <Flame className="size-3" /> Spicy
                </Badge>
              ) : null}
            </div>
            <span
              className="grid size-6 place-items-center rounded-md border border-white/70 bg-white/90 shadow-sm"
              title={dish.isVeg ? "Vegetarian" : "Contains non-vegetarian ingredients"}
            >
              <span
                className={cn(
                  "block size-2.5 rounded-full",
                  dish.isVeg ? "bg-emerald-600" : "bg-red-600",
                )}
              />
            </span>
          </div>
        </button>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                {dish.categoryName}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold leading-tight">
                {dish.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold">{formatNPR(displayPrice)}</p>
              {dish.comparePrice && dish.comparePrice > displayPrice ? (
                <p className="text-xs text-muted-foreground line-through">
                  {formatNPR(dish.comparePrice)}
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {dish.description}
          </p>
          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" /> {dish.prepTime} min
              </span>
              {dish.isVeg ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Leaf className="size-3" /> Veg
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <FavoriteToggleButton
                dishId={dish.id}
                initialFavorited={initialFavorited}
                iconOnly
              />
              {hasVariants ? (
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => setOpen(true)}
                  className="rounded-full gap-1.5 px-3 font-medium text-primary hover:bg-primary/15"
                  title={`Choose option for ${dish.name}`}
                >
                  <SlidersHorizontal className="size-3.5" /> Options
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    if (dish.addOns.length > 0) {
                      setOpen(true);
                    } else {
                      addItem({
                        dishId: dish.id,
                        name: dish.name,
                        slug: dish.slug,
                        image: dish.image,
                        categoryName: dish.categoryName,
                        basePrice: dish.price,
                        variantId: defaultVariant?.id,
                        variantName: defaultVariant?.name,
                        variantPrice: defaultVariant?.priceDelta ?? 0,
                        addOns: [],
                        quantity: 1,
                      });
                      toast.success(`${dish.name} added to cart`, {
                        description: `1 × ${formatNPR(displayPrice)} · ${cartCount(items) + 1} items in cart`,
                      });
                    }
                  }}
                  className="rounded-full"
                >
                  <Plus className="size-4" /> Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      <DishDialog dish={dish} open={open} onOpenChange={setOpen} />
    </>
  );
}

function DishDialog({
  dish,
  open,
  onOpenChange,
}: {
  dish: MenuDish;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const defaultVariant =
    dish.variants.find((variant) => variant.isDefault) ?? dish.variants[0];
  const [variantId, setVariantId] = useState<string | null>(
    defaultVariant?.id ?? null,
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");

  const variant = dish.variants.find((item) => item.id === variantId);
  const addOns = dish.addOns.filter((item) =>
    selectedAddOns.includes(item.id),
  );
  const unitPrice =
    dish.price +
    (variant?.priceDelta ?? 0) +
    addOns.reduce((sum, item) => sum + item.price, 0);

  const reset = () => {
    setVariantId(defaultVariant?.id ?? null);
    setSelectedAddOns([]);
    setQuantity(1);
    setInstructions("");
  };

  const addToCart = () => {
    addItem({
      dishId: dish.id,
      name: dish.name,
      slug: dish.slug,
      image: dish.image,
      categoryName: dish.categoryName,
      basePrice: dish.price,
      variantId: variant?.id,
      variantName: variant?.name,
      variantPrice: variant?.priceDelta ?? 0,
      addOns,
      quantity,
      instructions,
    });
    toast.success(`${dish.name} added to cart`, {
      description: `${quantity} × ${formatNPR(unitPrice)} · ${cartCount(items) + quantity} items in cart`,
    });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-xl p-0">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-muted">
          <SmartImage
            src={dish.image}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
        </div>
        <div className="max-h-[62dvh] overflow-y-auto p-6 pt-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                {dish.categoryName}
              </p>
              <DialogTitle className="mt-1">{dish.name}</DialogTitle>
            </div>
            <p className="mt-1 shrink-0 font-semibold text-lg">
              {formatNPR(dish.price + (variant?.priceDelta ?? 0))}
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {dish.description}
          </p>

          {dish.variants.length > 0 ? (
            <fieldset className="mt-5">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <SlidersHorizontal className="size-3.5 text-primary" />
                <legend>Choose variant / portion</legend>
              </div>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {dish.variants.map((option) => {
                  const isSelected = variantId === option.id;
                  const optionPrice = dish.price + option.priceDelta;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-sm transition",
                        isSelected
                          ? "border-primary bg-secondary/60 shadow-xs ring-1 ring-primary/40 font-medium"
                          : "hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={`variant-${dish.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setVariantId(option.id)}
                          className="size-4 accent-primary"
                        />
                        <span>{option.name}</span>
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isSelected ? "text-primary font-bold" : "text-muted-foreground",
                        )}
                      >
                        {formatNPR(optionPrice)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {dish.addOns.length > 0 ? (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Add something extra</legend>
              <div className="mt-2 grid gap-2">
                {dish.addOns.map((addOn) => {
                  const checked = selectedAddOns.includes(addOn.id);
                  return (
                    <label
                      key={addOn.id}
                      className="flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition hover:border-primary/40"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedAddOns((current) =>
                              checked
                                ? current.filter((id) => id !== addOn.id)
                                : [...current, addOn.id],
                            )
                          }
                          className="accent-primary"
                        />
                        {addOn.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        +{formatNPR(addOn.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-5 space-y-1.5">
            <label
              htmlFor={`instructions-${dish.id}`}
              className="text-sm font-semibold"
            >
              Anything we should know?
            </label>
            <Textarea
              id={`instructions-${dish.id}`}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value.slice(0, 300))}
              placeholder="Less spicy, no coriander, allergy notes…"
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="mt-6 flex items-center gap-3 border-t pt-5">
            <div className="flex items-center rounded-lg border">
              <button
                type="button"
                className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button type="button" className="flex-1" size="lg" onClick={addToCart}>
              <ShoppingBag className="size-4" />
              Add {quantity} · {formatNPR(unitPrice * quantity)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
