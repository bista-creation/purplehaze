"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
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
      <div className="sticky top-[4.5rem] z-30 -mx-4 border-b border-border/70 bg-background/92 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-[6.75rem]">
        <div className="container-page flex flex-col gap-3 px-0 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search momos, curries, pizza…"
              className="bg-card pl-10"
              aria-label="Search the menu"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={vegOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setVegOnly((value) => !value)}
              aria-pressed={vegOnly}
              className="shrink-0"
            >
              <span
                className={cn(
                  "grid size-3.5 place-items-center rounded-sm border",
                  vegOnly
                    ? "border-primary-foreground/70"
                    : "border-emerald-600",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    vegOnly ? "bg-primary-foreground" : "bg-emerald-600",
                  )}
                />
              </span>
              Veg only
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              {total} {total === 1 ? "dish" : "dishes"}
            </span>
          </div>
        </div>
        <div className="container-page mt-3 flex gap-2 overflow-x-auto px-0 pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
              activeCategory === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            Everything
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                activeCategory === category.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {category.name}
              <span className="ml-1.5 opacity-60">{category.dishes.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-12">
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
            <section key={category.id} id={category.slug} aria-labelledby={`${category.slug}-heading`}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">{category.dishes.length} dishes</p>
                  <h2
                    id={`${category.slug}-heading`}
                    className="mt-1 font-display text-3xl font-semibold"
                  >
                    {category.name}
                  </h2>
                  {category.description ? (
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.dishes.map((dish: MenuDish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
