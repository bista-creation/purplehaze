import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { dishAdminSchema } from "@/lib/validations";
import { rupeesToPaisa } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

async function uniqueDishSlug(source: string, currentId?: string) {
  const base = slugify(source) || `dish-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const existing = await prisma.dish.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Dish ID is required.", 400);
  }

  const existingDish = await prisma.dish.findUnique({ where: { id } });
  if (!existingDish) {
    return jsonError("NOT_FOUND", "Dish not found.", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = dishAdminSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return jsonError("NOT_FOUND", "Choose a valid category.", 404);
  }

  const slug = await uniqueDishSlug(parsed.data.slug || parsed.data.name, id);
  const activeVariants = parsed.data.variants.filter((v) => v.name.trim().length > 0);

  let basePriceNpr = parsed.data.price ?? 0;
  if (activeVariants.length > 0) {
    const defaultVar = activeVariants.find((v) => v.isDefault) || activeVariants[0];
    if (!basePriceNpr || basePriceNpr <= 0) {
      basePriceNpr = defaultVar.priceDelta;
    }
  }

  const variants = activeVariants.map((variant, index) => {
    const delta = Math.max(0, variant.priceDelta - basePriceNpr);
    return {
      name: variant.name,
      priceDelta: rupeesToPaisa(delta),
      isDefault: variant.isDefault,
      sortOrder: index,
      isAvailable: true,
    };
  });
  if (variants.length > 0 && !variants.some((v) => v.isDefault)) {
    variants[0].isDefault = true;
  }

  const updatedDish = await prisma.$transaction(async (tx) => {
    await tx.dish.update({
      where: { id },
      data: {
        categoryId: category.id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        details: parsed.data.details || null,
        price: rupeesToPaisa(basePriceNpr),
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
      },
    });

    await tx.dishVariant.deleteMany({ where: { dishId: id } });
    await tx.dishAddOn.deleteMany({ where: { dishId: id } });

    if (variants.length > 0) {
      await tx.dishVariant.createMany({
        data: variants.map((v) => ({ ...v, dishId: id })),
      });
    }

    if (parsed.data.addOnIds?.length > 0) {
      await tx.dishAddOn.createMany({
        data: parsed.data.addOnIds.map((addOnId) => ({
          dishId: id,
          addOnId,
        })),
      });
    }

    return tx.dish.findUnique({
      where: { id },
      include: { variants: true, addOns: { include: { addOn: true } } },
    });
  });

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "dish.update",
    entity: "Dish",
    entityId: id,
    details: { name: updatedDish?.name, price: updatedDish?.price },
  });

  return jsonOk(updatedDish);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Dish ID is required.", 400);
  }

  const dish = await prisma.dish.findUnique({ where: { id } });
  if (!dish) {
    return jsonError("NOT_FOUND", "Dish not found.", 404);
  }

  try {
    await prisma.dish.delete({ where: { id } });
    await writeAuditLog({
      userId: authCheck.user.id,
      actorEmail: authCheck.user.email,
      action: "dish.delete",
      entity: "Dish",
      entityId: id,
      details: { name: dish.name },
    });
    return jsonOk({ message: "Dish deleted successfully." });
  } catch (error) {
    console.error("Failed to delete dish:", error);
    return jsonError(
      "CONFLICT",
      "We could not delete the dish. Hide it instead if it appears on past orders.",
      409,
    );
  }
}
