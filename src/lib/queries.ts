import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MenuDish } from "@/types";

export const getMenuCategories = cache(async () => {
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
});

export const getFeaturedDishes = cache(async (limit = 8) => {
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
});

export const getPublicVenues = cache(async () => {
  return prisma.venue.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
});

export const getPublicGallery = cache(async () => {
  return prisma.galleryImage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
});

export const getTestimonials = cache(async (limit = 6) => {
  return prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
});

export const getApprovedReviews = cache(async (limit = 6) => {
  return prisma.review.findMany({
    where: { isApproved: true },
    include: {
      user: { select: { name: true, image: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
});

export const getActiveBanners = cache(async () => {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
});

export const getActiveDeliveryZones = cache(async () => {
  return prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
});
