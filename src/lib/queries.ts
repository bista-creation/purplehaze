import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CANONICAL_VENUES } from "@/lib/venues-data";
import type { MenuDish } from "@/types";

export const getMenuCategories = cache(async () => {
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

    return categories.map((category) => ({
      ...category,
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
  } catch {
    console.warn("Database offline in getMenuCategories; using empty fallback.");
    return [];
  }
});

export const getFeaturedDishes = cache(async (limit = 8) => {
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

    return dishes.map(
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
  } catch {
    console.warn("Database offline in getFeaturedDishes; using empty fallback.");
    return [];
  }
});

export const getPublicVenues = cache(async () => {
  try {
    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    if (venues && venues.length > 0) {
      return venues;
    }
  } catch {
    console.warn("Database offline in getPublicVenues; using canonical fallback.");
  }
  return CANONICAL_VENUES.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    description: v.description,
    longDescription: v.longDescription,
    image: v.image,
    capacity: v.capacity,
    priceFrom: null,
    features: JSON.stringify(v.features),
    isActive: true,
    sortOrder: v.sortOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
});

export const getPublicGallery = cache(async () => {
  try {
    return await prisma.galleryImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    console.warn("Database offline in getPublicGallery; using empty fallback.");
    return [];
  }
});

export const getTestimonials = cache(async (limit = 6) => {
  try {
    return await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
    });
  } catch {
    console.warn("Database offline in getTestimonials; using empty fallback.");
    return [];
  }
});

export const getApprovedReviews = cache(async (limit = 6) => {
  try {
    return await prisma.review.findMany({
      where: { isApproved: true },
      include: {
        user: { select: { name: true, image: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  } catch {
    console.warn("Database offline in getApprovedReviews; using empty fallback.");
    return [];
  }
});

export const getActiveBanners = cache(async () => {
  try {
    const now = new Date();
    return await prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    console.warn("Database offline in getActiveBanners; using empty fallback.");
    return [];
  }
});

export const getActiveDeliveryZones = cache(async () => {
  try {
    return await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch {
    console.warn("Database offline in getActiveDeliveryZones; using empty fallback.");
    return [];
  }
});
