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
  viewMode = "auto",
}: {
  dish: MenuDish;
  initialFavorited?: boolean;
  viewMode?: "auto" | "list" | "grid";
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

  const handleQuickAdd = () => {
    if (hasVariants || dish.addOns.length > 0) {
      setOpen(true);
      return;
    }
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
  };

  const isAlwaysGrid = viewMode === "grid";

  return (
    <>
      <article
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/75 bg-card shadow-[0_4px_20px_-10px_rgba(76,29,149,0.08)] transition duration-200 hover:border-primary/40 hover:shadow-[0_12px_32px_-12px_rgba(76,29,149,0.18)]",
          isAlwaysGrid
            ? "flex flex-col p-3"
            : "flex flex-row items-stretch justify-between p-3 sm:flex-col sm:p-0"
        )}
      >
        {/* DESKTOP & ALWAYS-GRID IMAGE HEADER */}
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            isAlwaysGrid
              ? "aspect-[4/3] rounded-xl"
              : "hidden sm:block sm:aspect-[4/3] sm:rounded-none"
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 size-full cursor-pointer text-left focus-visible:outline-none"
            aria-label={`View and customize ${dish.name}`}
          >
            <SmartImage
              src={dish.image}
              alt={dish.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5 sm:p-3">
            <div className="flex flex-wrap gap-1">
              {dish.isFeatured ? (
                <Badge variant="gold" className="text-[10px] backdrop-blur-md px-1.5 py-0.5">
                  Popular
                </Badge>
              ) : null}
              {dish.isSpicy ? (
                <Badge variant="red" className="gap-0.5 text-[10px] backdrop-blur-md px-1.5 py-0.5">
                  <Flame className="size-2.5" /> Spicy
                </Badge>
              ) : null}
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <span
                className="grid size-5 place-items-center rounded-md border border-black/10 bg-white/95 shadow-xs dark:bg-zinc-900/95"
                title={dish.isVeg ? "Vegetarian" : "Contains non-vegetarian ingredients"}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    dish.isVeg ? "bg-emerald-600" : "bg-red-600"
                  )}
                />
              </span>
              <FavoriteToggleButton
                dishId={dish.id}
                initialFavorited={initialFavorited}
                iconOnly
                className="size-7 bg-white/90 backdrop-blur-xs hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* MAIN INFO SECTION */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between",
            isAlwaysGrid ? "pt-3" : "min-w-0 pr-3 sm:p-4 sm:pr-4"
          )}
        >
          <div>
            {/* MOBILE TAGS & VEG ICON (ONLY ON LIST VIEW) */}
            {!isAlwaysGrid && (
              <div className="flex items-center gap-1.5 sm:hidden">
                <span
                  className="grid size-4 place-items-center rounded-sm border border-border/80 bg-background shadow-xs shrink-0"
                  title={dish.isVeg ? "Vegetarian" : "Contains non-vegetarian ingredients"}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      dish.isVeg ? "bg-emerald-600" : "bg-red-600"
                    )}
                  />
                </span>
                {dish.isFeatured ? (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Popular
                  </span>
                ) : null}
                {dish.isSpicy ? (
                  <span className="flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] font-bold text-red-600 dark:text-red-400">
                    <Flame className="size-2.5" /> Spicy
                  </span>
                ) : null}
                <span className="text-[10px] font-medium text-muted-foreground truncate">
                  {dish.categoryName}
                </span>
              </div>
            )}

            {/* CATEGORY (DESKTOP) */}
            <p className={cn("hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80", !isAlwaysGrid && "sm:block")}>
              {dish.categoryName}
            </p>

            {/* DISH TITLE */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-1 text-left focus-visible:outline-none"
            >
              <h3 className="font-display font-semibold text-sm leading-snug text-foreground transition-colors group-hover:text-primary sm:text-base">
                {dish.name}
              </h3>
            </button>

            {/* PRICE */}
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-bold text-sm text-foreground sm:text-base">
                {formatNPR(displayPrice)}
              </span>
              {dish.comparePrice && dish.comparePrice > displayPrice ? (
                <span className="text-xs text-muted-foreground line-through">
                  {formatNPR(dish.comparePrice)}
                </span>
              ) : null}
            </div>

            {/* SHORT DESCRIPTION */}
            {dish.description ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                {dish.description}
              </p>
            ) : null}
          </div>

          {/* FOOTER INFO (PREP TIME & DESKTOP ACTIONS) */}
          <div
            className={cn(
              "mt-2 flex items-center justify-between border-t border-border/50 pt-2.5",
              !isAlwaysGrid && "hidden sm:flex"
            )}
          >
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" /> {dish.prepTime} min
              </span>
              {dish.isVeg ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Leaf className="size-3" /> Veg
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {!isAlwaysGrid && (
                <FavoriteToggleButton
                  dishId={dish.id}
                  initialFavorited={initialFavorited}
                  iconOnly
                  className="hidden sm:inline-flex size-7"
                />
              )}
              {hasVariants ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(true)}
                  className="h-7 rounded-full border border-primary/30 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 dark:border-amber-300/60 dark:text-amber-300 dark:hover:bg-amber-300/15 dark:hover:text-amber-200 transition-colors"
                >
                  <SlidersHorizontal className="size-3 mr-1" /> Options
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickAdd}
                  className="h-7 rounded-full px-2.5 text-xs font-bold bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 dark:hover:text-black dark:shadow-[0_2px_8px_rgba(252,211,77,0.25)] transition-colors"
                >
                  <Plus className="size-3.5 mr-0.5" /> Add
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE SMALL IMAGE & THUMBNAIL ACTION (LIST VIEW ONLY) */}
        {!isAlwaysGrid && (
          <div className="relative shrink-0 flex flex-col items-center justify-between pl-1 sm:hidden">
            {/* Small compact dish image (size-24 = 96x96px) */}
            <div
              onClick={() => setOpen(true)}
              className="relative size-24 cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-muted shadow-xs transition active:scale-95"
            >
              <SmartImage
                src={dish.image}
                alt={dish.name}
                fill
                sizes="96px"
                className="object-cover"
              />
              <div className="absolute right-1 top-1 z-10">
                <FavoriteToggleButton
                  dishId={dish.id}
                  initialFavorited={initialFavorited}
                  iconOnly
                  className="size-6 bg-background/85 backdrop-blur-xs hover:bg-background"
                />
              </div>
            </div>

            {/* Mobile Add / Options Action Button under thumbnail */}
            <div className="mt-2 w-full">
              {hasVariants ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(true)}
                  className="h-7 w-full rounded-lg border border-primary/40 bg-card px-1 text-[11px] font-semibold text-primary shadow-xs hover:bg-primary/10 dark:border-amber-300/60 dark:bg-card dark:text-amber-300 dark:hover:bg-amber-300/15 dark:hover:text-amber-200 transition-colors"
                >
                  <SlidersHorizontal className="size-3 mr-1" />
                  Options
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickAdd}
                  className="h-7 w-full rounded-lg bg-primary/15 px-1 text-[11px] font-bold text-primary shadow-xs hover:bg-primary hover:text-primary-foreground dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 dark:hover:text-black dark:shadow-[0_2px_8px_rgba(252,211,77,0.25)] transition-colors"
                >
                  <Plus className="size-3.5 mr-0.5" />
                  Add
                </Button>
              )}
            </div>
          </div>
        )}
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
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* COMPACT MODAL HEADER IMAGE FOR MOBILE & DESKTOP */}
        <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-muted">
          <SmartImage
            src={dish.image}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
                {dish.categoryName}
              </p>
              <DialogTitle className="mt-0.5 text-lg sm:text-xl font-display font-semibold text-white drop-shadow-sm">
                {dish.name}
              </DialogTitle>
            </div>
            <p className="font-bold text-base sm:text-lg text-white drop-shadow-sm">
              {formatNPR(dish.price + (variant?.priceDelta ?? 0))}
            </p>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-5 pt-3">
          {dish.description ? (
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {dish.description}
            </p>
          ) : null}

          {dish.variants.length > 0 ? (
            <fieldset className="mt-4">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
                <SlidersHorizontal className="size-3.5 text-primary" />
                <legend>Choose option / portion</legend>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {dish.variants.map((option) => {
                  const isSelected = variantId === option.id;
                  const optionPrice = dish.price + option.priceDelta;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-xs sm:text-sm transition",
                        isSelected
                          ? "border-primary bg-secondary/60 shadow-xs ring-1 ring-primary/40 font-medium"
                          : "hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`variant-${dish.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setVariantId(option.id)}
                          className="size-3.5 accent-primary"
                        />
                        <span>{option.name}</span>
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isSelected ? "text-primary font-bold" : "text-muted-foreground"
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
            <fieldset className="mt-4">
              <legend className="text-xs sm:text-sm font-semibold">Add extras</legend>
              <div className="mt-2 grid gap-1.5">
                {dish.addOns.map((addOn) => {
                  const checked = selectedAddOns.includes(addOn.id);
                  return (
                    <label
                      key={addOn.id}
                      className="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-xs sm:text-sm transition hover:border-primary/40"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedAddOns((current) =>
                              checked
                                ? current.filter((id) => id !== addOn.id)
                                : [...current, addOn.id]
                            )
                          }
                          className="accent-primary size-3.5"
                        />
                        <span>{addOn.name}</span>
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

          <div className="mt-4 space-y-1">
            <label
              htmlFor={`instructions-${dish.id}`}
              className="text-xs sm:text-sm font-semibold"
            >
              Special instructions (optional)
            </label>
            <Textarea
              id={`instructions-${dish.id}`}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value.slice(0, 300))}
              placeholder="e.g. less spicy, extra lemon, packing notes…"
              rows={2}
              maxLength={300}
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="mt-5 flex items-center gap-2.5 border-t border-border/60 pt-4">
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                className="grid size-8 place-items-center text-muted-foreground hover:text-foreground active:bg-muted"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-7 text-center text-xs sm:text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                className="grid size-8 place-items-center text-muted-foreground hover:text-foreground active:bg-muted"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <Button
              type="button"
              className="flex-1 font-semibold text-xs sm:text-sm h-9 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 dark:hover:text-black dark:shadow-[0_2px_12px_rgba(252,211,77,0.25)] transition-colors"
              size="default"
              onClick={addToCart}
            >
              <ShoppingBag className="size-3.5 mr-1" />
              Add {quantity} · {formatNPR(unitPrice * quantity)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
