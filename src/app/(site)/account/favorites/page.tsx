import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { DishCard } from "@/components/menu/dish-card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import type { MenuDish } from "@/types";

export const metadata: Metadata = { title: "Favourites" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireUser();
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      dish: {
        include: {
          category: true,
          variants: {
            where: { isAvailable: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          addOns: {
            where: { addOn: { isActive: true } },
            include: { addOn: true },
          },
        },
      },
    },
  });

  const dishes: MenuDish[] = favorites.map(({ dish }) => ({
    id: dish.id,
    categoryId: dish.categoryId,
    categoryName: dish.category.name,
    categorySlug: dish.category.slug,
    name: dish.name,
    slug: dish.slug,
    description: dish.description,
    details: dish.details,
    price: dish.price,
    comparePrice: dish.comparePrice,
    image: dish.image,
    isVeg: dish.isVeg,
    isSpicy: dish.isSpicy,
    isFeatured: dish.isFeatured,
    prepTime: dish.prepTime,
    calories: dish.calories,
    variants: dish.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceDelta: variant.priceDelta,
      isDefault: variant.isDefault,
    })),
    addOns: dish.addOns
      .map(({ addOn }) => ({
        id: addOn.id,
        name: addOn.name,
        price: addOn.price,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div>
      <div>
        <p className="eyebrow">Kept close</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Favourites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The dishes you keep coming back to. Tap the heart to remove one.
        </p>
      </div>

      {dishes.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Tap the heart on any dish to keep it here for next time."
            actionLabel="Browse the menu"
            actionHref="/menu"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} initialFavorited />
          ))}
        </div>
      )}
    </div>
  );
}
