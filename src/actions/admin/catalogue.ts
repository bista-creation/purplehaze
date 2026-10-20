"use server";

import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
} from "@/lib/admin";
import {
  categoryAdminSchema,
  couponAdminSchema,
  dishAdminSchema,
  venueAdminSchema,
  type CategoryAdminInput,
  type CouponAdminInput,
  type DishAdminInput,
  type VenueAdminInput,
} from "@/lib/validations";
import { rupeesToPaisa } from "@/lib/money";
import { parseNepalDateTime } from "@/lib/time";
import { slugify } from "@/lib/utils";
import type { AdminActionResult } from "@/actions/admin/orders";

async function uniqueSlug(
  model: "dish" | "category" | "venue",
  source: string,
  currentId?: string,
) {
  const base = slugify(source) || `item-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  // The loop is bounded in practice; the suffix guarantees eventual success.
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

export async function saveCategoryAction(
  input: CategoryAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = categoryAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the category details.",
    };
  }
  try {
    const user = await adminActionUser();
    const slug = await uniqueSlug("category", parsed.data.name, id);
    const data = {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      image: parsed.data.image || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    };
    if (id) {
      await prisma.category.update({ where: { id }, data });
    } else {
      await prisma.category.create({ data });
    }
    await auditAction(
      user,
      id ? "category.update" : "category.create",
      "Category",
      id,
      { name: parsed.data.name },
    );
    refreshAdmin("/admin/menu", "/menu");
    return { success: true, message: id ? "Category updated." : "Category created." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the category."),
    };
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { dishes: true } } },
    });
    if (!category) return { success: false, message: "Category not found." };
    if (category._count.dishes > 0) {
      return {
        success: false,
        message:
          "Move or delete the dishes in this category first, or hide it instead.",
      };
    }
    await prisma.category.delete({ where: { id } });
    await auditAction(user, "category.delete", "Category", id, {
      name: category.name,
    });
    refreshAdmin("/admin/menu", "/menu");
    return { success: true, message: "Category deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the category."),
    };
  }
}

export async function saveDishAction(
  input: DishAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = dishAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the dish details.",
    };
  }
  try {
    const user = await adminActionUser();
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) return { success: false, message: "Choose a valid category." };

    const addOns = await prisma.addOn.findMany({
      where: { id: { in: parsed.data.addOnIds } },
      select: { id: true },
    });
    const slug = await uniqueSlug(
      "dish",
      parsed.data.slug || parsed.data.name,
      id,
    );
    const variants = parsed.data.variants.map((variant, index) => ({
      name: variant.name,
      priceDelta: rupeesToPaisa(variant.priceDelta),
      isDefault: variant.isDefault,
      sortOrder: index,
      isAvailable: true,
    }));
    if (variants.length > 0 && !variants.some((variant) => variant.isDefault)) {
      variants[0].isDefault = true;
    }

    const data = {
      categoryId: category.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      details: parsed.data.details || null,
      price: rupeesToPaisa(parsed.data.price),
      comparePrice:
        parsed.data.comparePrice && parsed.data.comparePrice > 0
          ? rupeesToPaisa(parsed.data.comparePrice)
          : null,
      image: parsed.data.image || null,
      isVeg: parsed.data.isVeg,
      isSpicy: parsed.data.isSpicy,
      isFeatured: parsed.data.isFeatured,
      isAvailable: parsed.data.isAvailable,
      prepTime: parsed.data.prepTime,
      calories:
        parsed.data.calories && parsed.data.calories > 0
          ? parsed.data.calories
          : null,
      sortOrder: parsed.data.sortOrder,
    };

    const dish = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.dish.update({ where: { id }, data })
        : await tx.dish.create({ data });
      await tx.dishVariant.deleteMany({ where: { dishId: saved.id } });
      await tx.dishAddOn.deleteMany({ where: { dishId: saved.id } });
      if (variants.length > 0) {
        await tx.dishVariant.createMany({
          data: variants.map((variant) => ({ ...variant, dishId: saved.id })),
        });
      }
      if (addOns.length > 0) {
        await tx.dishAddOn.createMany({
          data: addOns.map((addOn) => ({ dishId: saved.id, addOnId: addOn.id })),
        });
      }
      return saved;
    });

    await auditAction(
      user,
      id ? "dish.update" : "dish.create",
      "Dish",
      dish.id,
      { name: dish.name, price: dish.price },
    );
    refreshAdmin("/admin/menu", "/menu", `/order`, "/account/favorites");
    return {
      success: true,
      message: id ? "Dish updated." : "Dish added to the menu.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the dish."),
    };
  }
}

export async function deleteDishAction(id: string): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const dish = await prisma.dish.findUnique({ where: { id } });
    if (!dish) return { success: false, message: "Dish not found." };
    await prisma.dish.delete({ where: { id } });
    await auditAction(user, "dish.delete", "Dish", id, {
      name: dish.name,
      price: dish.price,
    });
    refreshAdmin("/admin/menu", "/menu", "/account/favorites");
    return { success: true, message: "Dish deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "We couldn't delete the dish. Hide it instead if it appears on old orders.",
      ),
    };
  }
}

export async function setDishAvailabilityAction(
  ids: string[],
  isAvailable: boolean,
): Promise<AdminActionResult> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return { success: false, message: "Choose at least one dish." };
  }
  try {
    const user = await adminActionUser();
    const result = await prisma.dish.updateMany({
      where: { id: { in: ids } },
      data: { isAvailable },
    });
    await auditAction(
      user,
      "dish.availability.bulk",
      "Dish",
      null,
      { ids, isAvailable, count: result.count },
    );
    refreshAdmin("/admin/menu", "/menu");
    return {
      success: true,
      message: `${result.count} dish${result.count === 1 ? "" : "es"} marked ${isAvailable ? "available" : "unavailable"}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the dishes."),
    };
  }
}

export async function saveAddOnAction(
  input: { name: string; price: number; isActive?: boolean; sortOrder?: number },
  id?: string,
): Promise<AdminActionResult> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Give the add-on a name." };
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { success: false, message: "Enter a valid add-on price." };
  }
  try {
    const user = await adminActionUser();
    const data = {
      name,
      price: rupeesToPaisa(input.price),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    };
    if (id) await prisma.addOn.update({ where: { id }, data });
    else await prisma.addOn.create({ data });
    await auditAction(user, id ? "addon.update" : "addon.create", "AddOn", id, {
      name,
    });
    refreshAdmin("/admin/menu", "/menu");
    return { success: true, message: id ? "Add-on updated." : "Add-on created." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the add-on."),
    };
  }
}

export async function deleteAddOnAction(id: string): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const addOn = await prisma.addOn.findUnique({ where: { id } });
    if (!addOn) return { success: false, message: "Add-on not found." };
    await prisma.addOn.delete({ where: { id } });
    await auditAction(user, "addon.delete", "AddOn", id, { name: addOn.name });
    refreshAdmin("/admin/menu", "/menu");
    return { success: true, message: "Add-on deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the add-on."),
    };
  }
}

export async function saveVenueAction(
  input: VenueAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = venueAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the venue details.",
    };
  }
  try {
    const user = await adminActionUser();
    const slug = await uniqueSlug("venue", parsed.data.slug || parsed.data.name, id);
    const data = {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      longDescription: parsed.data.longDescription || null,
      image: parsed.data.image || null,
      capacity:
        parsed.data.capacity && parsed.data.capacity > 0
          ? parsed.data.capacity
          : null,
      priceFrom:
        parsed.data.priceFrom && parsed.data.priceFrom > 0
          ? rupeesToPaisa(parsed.data.priceFrom)
          : null,
      features: JSON.stringify(parsed.data.features),
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
    };
    if (id) await prisma.venue.update({ where: { id }, data });
    else await prisma.venue.create({ data });
    await auditAction(user, id ? "venue.update" : "venue.create", "Venue", id, {
      name: parsed.data.name,
    });
    refreshAdmin("/admin/venues", "/events", "/");
    return { success: true, message: id ? "Venue updated." : "Venue created." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the venue."),
    };
  }
}

export async function deleteVenueAction(id: string): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!venue) return { success: false, message: "Venue not found." };
    if (venue._count.bookings > 0) {
      return {
        success: false,
        message:
          "This venue has event enquiries attached. Hide it instead of deleting it.",
      };
    }
    await prisma.venue.delete({ where: { id } });
    await auditAction(user, "venue.delete", "Venue", id, { name: venue.name });
    refreshAdmin("/admin/venues", "/events");
    return { success: true, message: "Venue deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the venue."),
    };
  }
}

export async function saveCouponAction(
  input: CouponAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = couponAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the coupon details.",
    };
  }
  try {
    const user = await adminActionUser();
    if (parsed.data.type === "PERCENT" && parsed.data.value > 100) {
      return { success: false, message: "A percentage cannot exceed 100." };
    }
    const startsAt = parsed.data.startsAt
      ? parseNepalDateTime(parsed.data.startsAt)
      : null;
    const expiresAt = parsed.data.expiresAt
      ? parseNepalDateTime(parsed.data.expiresAt)
      : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      return {
        success: false,
        message: "The expiry date must be after the start date.",
      };
    }
    const existing = await prisma.coupon.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing && existing.id !== id) {
      return { success: false, message: "That coupon code already exists." };
    }
    const data = {
      code: parsed.data.code,
      description: parsed.data.description || null,
      type: parsed.data.type,
      value:
        parsed.data.type === "FIXED"
          ? rupeesToPaisa(parsed.data.value)
          : Math.round(parsed.data.value),
      minOrder: rupeesToPaisa(parsed.data.minOrder ?? 0),
      maxDiscount:
        parsed.data.type === "PERCENT" && parsed.data.maxDiscount
          ? rupeesToPaisa(parsed.data.maxDiscount)
          : null,
      maxUses:
        parsed.data.maxUses && parsed.data.maxUses > 0
          ? parsed.data.maxUses
          : null,
      startsAt,
      expiresAt,
      isActive: parsed.data.isActive,
    };
    if (id) await prisma.coupon.update({ where: { id }, data });
    else await prisma.coupon.create({ data });
    await auditAction(user, id ? "coupon.update" : "coupon.create", "Coupon", id, {
      code: parsed.data.code,
    });
    refreshAdmin("/admin/coupons");
    return { success: true, message: id ? "Coupon updated." : "Coupon created." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the coupon."),
    };
  }
}

export async function deleteCouponAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return { success: false, message: "Coupon not found." };
    await prisma.coupon.delete({ where: { id } });
    await auditAction(user, "coupon.delete", "Coupon", id, { code: coupon.code });
    refreshAdmin("/admin/coupons");
    return { success: true, message: "Coupon deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "We couldn't delete the coupon. Deactivate it instead if orders use it.",
      ),
    };
  }
}
