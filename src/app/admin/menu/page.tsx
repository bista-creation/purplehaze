import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { MenuAdmin } from "@/components/admin/menu-admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/security";
import { getImageUploadMode, listImageOptions } from "@/lib/uploads";

export const metadata: Metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireAdmin("/admin/menu");

  type CategoryWithCount = Prisma.CategoryGetPayload<{
    include: { _count: { select: { dishes: true } } };
  }>;
  type DishWithRelations = Prisma.DishGetPayload<{
    include: {
      category: { select: { name: true } };
      variants: true;
      addOns: { select: { addOnId: true } };
    };
  }>;
  type AddOnWithCount = Prisma.AddOnGetPayload<{
    include: { _count: { select: { dishes: true } } };
  }>;

  let categories: CategoryWithCount[] = [];
  let dishes: DishWithRelations[] = [];
  let addOns: AddOnWithCount[] = [];
  let imageOptions: string[] = [];

  try {
    const results = await Promise.all([
      prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { dishes: true } } },
      }),
      prisma.dish.findMany({
        orderBy: [
          { category: { sortOrder: "asc" } },
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          category: { select: { name: true } },
          variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
          addOns: { select: { addOnId: true } },
        },
      }),
      prisma.addOn.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { dishes: true } } },
      }),
      listImageOptions("menu"),
    ]);
    categories = results[0];
    dishes = results[1];
    addOns = results[2];
    imageOptions = results[3];
  } catch {
    console.warn("Database offline in AdminMenuPage; using empty catalogue.");
    imageOptions = await listImageOptions("menu").catch(() => []);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Menu"
        description="Manage categories, dishes, variants, add-ons and availability. Public menu pages use ISR, so changes appear within a minute or immediately after revalidation."
      />
      <MenuAdmin
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          image: category.image,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          dishCount: category._count?.dishes ?? 0,
        }))}
        dishes={dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          slug: dish.slug,
          categoryId: dish.categoryId,
          categoryName: dish.category?.name ?? "General",
          description: dish.description,
          details: dish.details,
          price: dish.price,
          comparePrice: dish.comparePrice,
          image: dish.image,
          isVeg: dish.isVeg,
          isSpicy: dish.isSpicy,
          isFeatured: dish.isFeatured,
          isAvailable: dish.isAvailable,
          prepTime: dish.prepTime,
          calories: dish.calories,
          sortOrder: dish.sortOrder,
          variants: (dish.variants || []).map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceDelta: variant.priceDelta,
            isDefault: variant.isDefault,
          })),
          addOnIds: (dish.addOns || []).map((entry) => entry.addOnId),
        }))}
        addOns={addOns.map((addOn) => ({
          id: addOn.id,
          name: addOn.name,
          price: addOn.price,
          isActive: addOn.isActive,
          sortOrder: addOn.sortOrder,
          dishCount: addOn._count?.dishes ?? 0,
        }))}
        uploadMode={getImageUploadMode()}
        imageOptions={imageOptions}
      />
    </>
  );
}
