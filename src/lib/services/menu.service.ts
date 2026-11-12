import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { MenuDish, MenuCategoryView } from "@/lib/shared/types";
import type { CategoryAdminInput, DishAdminInput } from "@/lib/validations";
import { rupeesToPaisa } from "@/lib/money";

async function uniqueSlug(
  model: "dish" | "category" | "venue",
  source: string,
  currentId?: string,
) {
  const base = slugify(source) || `item-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const existing =
      model === "dish"
        ? await prisma.dish.findUnique({ where: { slug: candidate } })
        : model === "category"
          ? await prisma.category.findUnique({ where: { slug: candidate } })
          : await prisma.venue.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let cachedCategories: CacheEntry<MenuCategoryView[]> | null = null;
let cachedFeaturedDishes: CacheEntry<MenuDish[]> | null = null;
const cachedDishesMap = new Map<string, CacheEntry<MenuDish[]>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateMenuCache() {
  cachedCategories = null;
  cachedFeaturedDishes = null;
  cachedDishesMap.clear();
}

export class MenuService {
  invalidateCache() {
    invalidateMenuCache();
  }

  getMenuCategories = cache(async (): Promise<MenuCategoryView[]> => {
    if (cachedCategories && Date.now() - cachedCategories.timestamp < CACHE_TTL_MS) {
      return cachedCategories.data;
    }

    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          dishes: {
            where: { isAvailable: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            include: {
              variants: {
                where: { isAvailable: true },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              },
              addOns: {
                include: { addOn: true },
              },
            },
          },
        },
      });

      const result = categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        dishes: category.dishes.map(
          (dish): MenuDish => ({
            id: dish.id,
            categoryId: dish.categoryId,
            categoryName: category.name,
            categorySlug: category.slug,
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
            isAvailable: dish.isAvailable,
            prepTime: dish.prepTime,
            calories: dish.calories,
            variants: dish.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              priceDelta: variant.priceDelta,
              isDefault: variant.isDefault,
            })),
            addOns: dish.addOns.map(({ addOn }) => ({
              id: addOn.id,
              name: addOn.name,
              price: addOn.price,
            })),
          }),
        ),
      }));

      cachedCategories = { data: result, timestamp: Date.now() };
      return result;
    } catch (err) {
      console.warn("Database offline in getMenuCategories; using empty fallback.", err);
      return [];
    }
  });

  getFeaturedDishes = cache(async (limit = 8): Promise<MenuDish[]> => {
    if (limit === 8 && cachedFeaturedDishes && Date.now() - cachedFeaturedDishes.timestamp < CACHE_TTL_MS) {
      return cachedFeaturedDishes.data;
    }

    try {
      const dishes = await prisma.dish.findMany({
        where: { isAvailable: true, isFeatured: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          variants: { where: { isAvailable: true } },
          addOns: { include: { addOn: true } },
        },
      });

      const result = dishes.map(
        (dish): MenuDish => ({
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
          isAvailable: dish.isAvailable,
          prepTime: dish.prepTime,
          calories: dish.calories,
          variants: dish.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceDelta: variant.priceDelta,
            isDefault: variant.isDefault,
          })),
          addOns: dish.addOns.map(({ addOn }) => ({
            id: addOn.id,
            name: addOn.name,
            price: addOn.price,
          })),
        }),
      );

      if (limit === 8) {
        cachedFeaturedDishes = { data: result, timestamp: Date.now() };
      }
      return result;
    } catch (err) {
      console.warn("Database offline in getFeaturedDishes; using empty fallback.", err);
      return [];
    }
  });

  async getDishBySlug(slug: string): Promise<MenuDish | null> {
    const dish = await prisma.dish.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        variants: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
        addOns: { include: { addOn: true } },
      },
    });

    if (!dish) return null;

    return {
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
            isAvailable: dish.isAvailable,
      prepTime: dish.prepTime,
      calories: dish.calories,
      variants: dish.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceDelta: v.priceDelta,
        isDefault: v.isDefault,
      })),
      addOns: dish.addOns.map(({ addOn }) => ({
        id: addOn.id,
        name: addOn.name,
        price: addOn.price,
      })),
    };
  }

  async searchDishes(
    query?: string,
    filters?: {
      categorySlug?: string;
      isVeg?: boolean;
      isSpicy?: boolean;
      isFeatured?: boolean;
    },
  ) {
    const q = query?.trim().toLowerCase();
    const cacheKey = !q
      ? `${filters?.categorySlug || 'all'}_${filters?.isVeg}_${filters?.isSpicy}_${filters?.isFeatured}`
      : null;
    if (cacheKey && cachedDishesMap.has(cacheKey)) {
      const cached = cachedDishesMap.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const where: Prisma.DishWhereInput = {
      isAvailable: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.categorySlug) {
      where.category = { slug: filters.categorySlug };
    }
    if (typeof filters?.isVeg === "boolean") {
      where.isVeg = filters.isVeg;
    }
    if (typeof filters?.isSpicy === "boolean") {
      where.isSpicy = filters.isSpicy;
    }
    if (typeof filters?.isFeatured === "boolean") {
      where.isFeatured = filters.isFeatured;
    }

    const dishes = await prisma.dish.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        category: { select: { name: true, slug: true } },
        variants: { where: { isAvailable: true } },
        addOns: { include: { addOn: true } },
      },
    });

    const result = dishes.map((dish) => ({
      id: dish.id,
      categoryId: dish.categoryId,
      categoryName: dish.category.name,
      categorySlug: dish.category.slug,
      name: dish.name,
      slug: dish.slug,
      description: dish.description,
      price: dish.price,
      comparePrice: dish.comparePrice,
      image: dish.image,
      isVeg: dish.isVeg,
      isSpicy: dish.isSpicy,
      isFeatured: dish.isFeatured,
      isAvailable: dish.isAvailable,
      prepTime: dish.prepTime,
      variants: dish.variants,
      addOns: dish.addOns.map((a) => a.addOn),
    }));

    if (cacheKey) {
      cachedDishesMap.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    return result;
  }

  async saveCategory(input: CategoryAdminInput, id?: string) {
    invalidateMenuCache();
    const slug = await uniqueSlug("category", input.name, id);
    const data = {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };

    if (id) {
      return prisma.category.update({ where: { id }, data });
    }
    return prisma.category.create({ data });
  }

  async deleteCategory(id: string) {
    invalidateMenuCache();
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { dishes: true } } },
    });
    if (!category) {
      throw new Error("Category not found.");
    }
    if (category._count.dishes > 0) {
      throw new Error("Remove or reassign dishes before deleting this category.");
    }
    return prisma.category.delete({ where: { id } });
  }

  async saveDish(input: DishAdminInput, id?: string) {
    invalidateMenuCache();
    const slug = await uniqueSlug("dish", input.name, id);
    const data = {
      name: input.name,
      slug,
      categoryId: input.categoryId,
      description: input.description,
      details: input.details || null,
      price: rupeesToPaisa(input.price),
      comparePrice: input.comparePrice ? rupeesToPaisa(input.comparePrice) : null,
      image: input.image || null,
      isVeg: input.isVeg,
      isSpicy: input.isSpicy,
      isFeatured: input.isFeatured,
      isAvailable: input.isAvailable,
      prepTime: input.prepTime,
      calories: input.calories || null,
      sortOrder: input.sortOrder,
    };

    return prisma.$transaction(async (tx) => {
      const dish = id
        ? await tx.dish.update({ where: { id }, data })
        : await tx.dish.create({ data });

      // Upsert variants
      const existingVariants = id
        ? await tx.dishVariant.findMany({ where: { dishId: dish.id } })
        : [];
      const keepVariantIds = new Set<string>();

      for (const [idx, v] of (input.variants || []).entries()) {
        const vData = {
          name: v.name,
          priceDelta: rupeesToPaisa(v.priceDelta),
          isDefault: v.isDefault,
          isAvailable: true,
          sortOrder: idx,
        };
        if (v.id) {
          await tx.dishVariant.update({ where: { id: v.id }, data: vData });
          keepVariantIds.add(v.id);
        } else {
          const created = await tx.dishVariant.create({
            data: { dishId: dish.id, ...vData },
          });
          keepVariantIds.add(created.id);
        }
      }

      for (const existing of existingVariants) {
        if (!keepVariantIds.has(existing.id)) {
          await tx.dishVariant.delete({ where: { id: existing.id } });
        }
      }

      // Add-ons
      if (id) {
        await tx.dishAddOn.deleteMany({ where: { dishId: dish.id } });
      }
      if (input.addOnIds?.length) {
        await tx.dishAddOn.createMany({
          data: input.addOnIds.map((addOnId) => ({ dishId: dish.id, addOnId })),
        });
      }

      return dish;
    });
  }

  async deleteDish(id: string) {
    invalidateMenuCache();
    return prisma.dish.delete({ where: { id } });
  }

  async toggleDishAvailability(id: string, isAvailable: boolean) {
    invalidateMenuCache();
    return prisma.dish.update({
      where: { id },
      data: { isAvailable },
    });
  }
}

export const menuService = new MenuService();
