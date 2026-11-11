"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LayoutGrid, ListFilter, Search, SlidersHorizontal, UtensilsCrossed, X } from "lucide-react";
import { DishCard } from "@/components/menu/dish-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MenuCategoryView, MenuDish } from "@/types";

export function MenuBrowser({
  categories,
  initialCategory,
}: {
  categories: MenuCategoryView[];
  initialCategory?: string;
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory ?? "all");
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"auto" | "grid">("auto");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return categories
      .filter(
        (category) =>
          activeCategory === "all" || category.slug === activeCategory,
      )
      .map((category) => ({
        ...category,
        dishes: category.dishes.filter((dish) => {
          if (vegOnly && !dish.isVeg) return false;
          if (!normalizedQuery) return true;
          return (
            dish.name.toLowerCase().includes(normalizedQuery) ||
            dish.description.toLowerCase().includes(normalizedQuery) ||
            category.name.toLowerCase().includes(normalizedQuery)
          );
        }),
      }))
      .filter((category) => category.dishes.length > 0);
  }, [categories, activeCategory, deferredQuery, vegOnly]);

  const total = filtered.reduce((sum, category) => sum + category.dishes.length, 0);

  return (
    <div>
      {/* STICKY SEARCH & CATEGORY BAR */}
      <div className="sticky top-[3.75rem] z-30 -mx-4 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 sm:py-3 lg:top-[6.75rem]">
        <div className="container-page flex flex-col gap-2.5 px-0 sm:gap-3 lg:flex-row lg:items-center">
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search momos, sekuwa, curries, pizza…"
              className="h-10 bg-card pl-10 pr-9 text-xs sm:text-sm rounded-xl"
              aria-label="Search the menu"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* FILTERS & VIEW TOGGLE */}
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={vegOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setVegOnly((value) => !value)}
                aria-pressed={vegOnly}
                className="h-8 rounded-full text-xs font-medium px-3 shrink-0"
              >
                <span
                  className={cn(
                    "mr-1.5 grid size-3.5 place-items-center rounded-xs border",
                    vegOnly ? "border-primary-foreground/70" : "border-emerald-600"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      vegOnly ? "bg-primary-foreground" : "bg-emerald-600"
                    )}
                  />
                </span>
                Veg only
              </Button>

              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3 text-muted-foreground" />
                {total} {total === 1 ? "dish" : "dishes"}
              </span>
            </div>

            {/* MOBILE VIEW TOGGLE: COMPACT LIST VS 2-COL GRID */}
            <div className="flex items-center rounded-lg border border-border/70 bg-card/70 p-0.5 sm:hidden">
              <button
                type="button"
                onClick={() => setViewMode("auto")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition",
                  viewMode === "auto"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Compact list view"
                title="Compact list view"
              >
                <ListFilter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid view"
                title="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CATEGORIES */}
        <div className="container-page mt-2 sm:mt-2.5 flex gap-1.5 overflow-x-auto px-0 pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition active:scale-95",
              activeCategory === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/80 bg-card hover:border-primary/40 text-foreground/80"
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition active:scale-95",
                activeCategory === category.slug
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 bg-card hover:border-primary/40 text-foreground/80"
              )}
            >
              {category.name}
              <span className="ml-1.5 text-[11px] opacity-70">
                {category.dishes.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DISH SECTIONS */}
      <div className="mt-6 sm:mt-10 space-y-8 sm:space-y-12">
        {filtered.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nothing on that plate yet"
            description="Try a different search or clear the vegetarian filter."
            actionLabel="Clear filters"
            actionHref="/menu"
          >
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setQuery("");
                setVegOnly(false);
                setActiveCategory("all");
              }}
            >
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          filtered.map((category) => (
            <section
              key={category.id}
              id={category.slug}
              aria-labelledby={`${category.slug}-heading`}
            >
              <div className="mb-3 sm:mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-xs">{category.dishes.length} dishes</p>
                  <h2
                    id={`${category.slug}-heading`}
                    className="mt-0.5 font-display text-2xl sm:text-3xl font-semibold tracking-tight"
                  >
                    {category.name}
                  </h2>
                  {category.description ? (
                    <p className="mt-0.5 max-w-2xl text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
                      {category.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* RESPONSIVE GRID / LIST CONTAINER */}
              <div
                className={cn(
                  "grid gap-2.5 sm:gap-4 lg:gap-5",
                  viewMode === "grid"
                    ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                )}
              >
                {category.dishes.map((dish: MenuDish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    viewMode={viewMode === "grid" ? "grid" : "auto"}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
