"use server";

import bcrypt from "bcryptjs";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  assertSameOrigin,
  getActionUser,
  getCurrentUser,
} from "@/lib/security";
import {
  addressSchema,
  changePasswordSchema,
  profileSchema,
  type AddressInput,
} from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { parseAddOnNames } from "@/lib/utils";

export type AccountActionResult = {
  success: boolean;
  message: string;
};

export async function updateProfileAction(input: {
  name: string;
  phone: string;
  image?: string;
}): Promise<AccountActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your profile.",
    };
  }

  try {
    await assertSameOrigin();
    const user = await getActionUser();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        image: parsed.data.image || null,
      },
    });
    after(async () => {
      await writeAuditLog({
        userId: user.id,
        actorEmail: user.email,
        action: "account.profile.update",
        entity: "User",
        entityId: user.id,
      });
    });
    revalidatePath("/account");
    revalidatePath("/account/settings");
    return { success: true, message: "Your profile has been updated." };
  } catch (error) {
    console.error("Update profile failed", error);
    return { success: false, message: "We couldn't update your profile." };
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AccountActionResult & { signedOut?: boolean }> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your password.",
    };
  }

  try {
    await assertSameOrigin();
    const user = await getActionUser();
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record?.passwordHash) {
      return {
        success: false,
        message:
          "This account uses Google sign-in. Use the password reset link to add a password.",
      };
    }
    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      record.passwordHash,
    );
    if (!valid) {
      return { success: false, message: "Your current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "account.password.change",
      entity: "User",
      entityId: user.id,
    });
    return {
      success: true,
      signedOut: true,
      message:
        "Password changed. For security, please sign in again with your new password.",
    };
  } catch (error) {
    console.error("Change password failed", error);
    return { success: false, message: "We couldn't change your password." };
  }
}

export async function saveAddressAction(
  input: AddressInput & { id?: string },
): Promise<AccountActionResult> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check the address.",
    };
  }

  try {
    await assertSameOrigin();
    const user = await getActionUser();
    const existingCount = await prisma.address.count({
      where: { userId: user.id },
    });
    const makeDefault = parsed.data.isDefault || existingCount === 0;

    if (input.id) {
      const existing = await prisma.address.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!existing) {
        return { success: false, message: "Address not found." };
      }
    }

    await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }
      if (input.id) {
        await tx.address.update({
          where: { id: input.id },
          data: {
            label: parsed.data.label,
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            line1: parsed.data.line1,
            line2: parsed.data.line2 || null,
            city: parsed.data.city,
            state: parsed.data.state,
            postalCode: parsed.data.postalCode || null,
            country: parsed.data.country,
            isDefault: makeDefault,
          },
        });
      } else {
        await tx.address.create({
          data: {
            userId: user.id,
            label: parsed.data.label,
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            line1: parsed.data.line1,
            line2: parsed.data.line2 || null,
            city: parsed.data.city,
            state: parsed.data.state,
            postalCode: parsed.data.postalCode || null,
            country: parsed.data.country,
            isDefault: makeDefault,
          },
        });
      }
    });

    after(async () => {
      await writeAuditLog({
        userId: user.id,
        actorEmail: user.email,
        action: input.id ? "account.address.update" : "account.address.create",
        entity: "Address",
        entityId: input.id,
      });
    });
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return {
      success: true,
      message: input.id ? "Address updated." : "Address added.",
    };
  } catch (error) {
    console.error("Save address failed", error);
    return { success: false, message: "We couldn't save that address." };
  }
}

export async function deleteAddressAction(
  id: string,
): Promise<AccountActionResult> {
  try {
    await assertSameOrigin();
    const user = await getActionUser();
    const address = await prisma.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!address) return { success: false, message: "Address not found." };

    await prisma.address.delete({ where: { id: address.id } });
    if (address.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    after(async () => {
      await writeAuditLog({
        userId: user.id,
        actorEmail: user.email,
        action: "account.address.delete",
        entity: "Address",
        entityId: id,
      });
    });
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return { success: true, message: "Address removed." };
  } catch (error) {
    console.error("Delete address failed", error);
    return { success: false, message: "We couldn't remove that address." };
  }
}

export async function setDefaultAddressAction(
  id: string,
): Promise<AccountActionResult> {
  try {
    await assertSameOrigin();
    const user = await getActionUser();
    const address = await prisma.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!address) return { success: false, message: "Address not found." };
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: address.id },
        data: { isDefault: true },
      }),
    ]);
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return { success: true, message: "Default address updated." };
  } catch (error) {
    console.error("Set default address failed", error);
    return { success: false, message: "We couldn't update your address." };
  }
}

export async function toggleFavoriteAction(
  dishId: string,
): Promise<AccountActionResult & { favorited?: boolean }> {
  try {
    await assertSameOrigin();
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Please sign in to save favourites." };
    }
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, name: true, isAvailable: true },
    });
    if (!dish) return { success: false, message: "Dish not found." };
    const existing = await prisma.favorite.findUnique({
      where: { userId_dishId: { userId: user.id, dishId } },
    });
    if (existing) {
      await prisma.favorite.delete({
        where: { userId_dishId: { userId: user.id, dishId } },
      });
      revalidatePath("/account/favorites");
      revalidatePath("/menu");
      return {
        success: true,
        favorited: false,
        message: `${dish.name} removed from favourites.`,
      };
    }
    await prisma.favorite.create({ data: { userId: user.id, dishId } });
    revalidatePath("/account/favorites");
    revalidatePath("/menu");
    return {
      success: true,
      favorited: true,
      message: `${dish.name} saved to favourites.`,
    };
  } catch (error) {
    console.error("Toggle favorite failed", error);
    return { success: false, message: "We couldn't update your favourites." };
  }
}

export interface ReorderLine {
  dishId: string;
  name: string;
  slug: string;
  image: string | null;
  categoryName: string;
  basePrice: number;
  variantId: string | null;
  variantName: string | null;
  variantPrice: number;
  addOns: Array<{ id: string; name: string; price: number }>;
  quantity: number;
  instructions?: string;
}

export async function getReorderLinesAction(
  orderId: string,
): Promise<
  | { success: true; lines: ReorderLine[]; skipped: number }
  | { success: false; message: string }
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Please sign in first." };
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        items: {
          include: {
            dish: {
              include: {
                category: true,
                variants: { where: { isAvailable: true } },
                addOns: { include: { addOn: true } },
              },
            },
          },
        },
      },
    });
    if (!order) return { success: false, message: "Order not found." };

    const lines: ReorderLine[] = [];
    let skipped = 0;
    for (const item of order.items) {
      const dish = item.dish;
      if (!dish || !dish.isAvailable) {
        skipped += 1;
        continue;
      }
      const variant = item.variantName
        ? dish.variants.find((option) => option.name === item.variantName)
        : undefined;
      if (item.variantName && !variant) {
        // The option no longer exists; keep the dish but use its default.
        skipped += 0;
      }
      const wantedAddOns = new Set(parseAddOnNames(item.addOns));
      const addOns = dish.addOns
        .filter(({ addOn }) => addOn.isActive && wantedAddOns.has(addOn.name))
        .map(({ addOn }) => ({
          id: addOn.id,
          name: addOn.name,
          price: addOn.price,
        }));
      lines.push({
        dishId: dish.id,
        name: dish.name,
        slug: dish.slug,
        image: dish.image,
        categoryName: dish.category.name,
        basePrice: dish.price,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        variantPrice: variant?.priceDelta ?? 0,
        addOns,
        quantity: Math.min(20, item.quantity),
        instructions: item.instructions ?? undefined,
      });
    }

    return { success: true, lines, skipped };
  } catch (error) {
    console.error("Reorder lookup failed", error);
    return {
      success: false,
      message: "We couldn't rebuild that order. Please add items from the menu.",
    };
  }
}
