import "server-only";
import { prisma } from "@/lib/prisma";
import type { CartItemInputDto } from "@/lib/shared/types";

export type ValidatedCartLine = {
  dishId: string;
  name: string;
  variantId: string | null;
  variantName: string | null;
  addOns: Array<{ id: string; name: string; price: number }>;
  instructions: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CartCalculationResult =
  | {
      valid: true;
      items: ValidatedCartLine[];
      subtotal: number;
      itemCount: number;
    }
  | {
      valid: false;
      message: string;
    };

export class CartService {
  async validateAndCalculateItems(
    items: CartItemInputDto[],
  ): Promise<CartCalculationResult> {
    if (!items || items.length === 0) {
      return { valid: false, message: "Your cart is empty." };
    }

    const dishIds = [...new Set(items.map((item) => item.dishId))];
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      include: {
        variants: true,
        addOns: { include: { addOn: true } },
      },
    });

    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
    const validatedLines: ValidatedCartLine[] = [];

    for (const item of items) {
      const dish = dishMap.get(item.dishId);
      if (!dish || !dish.isAvailable) {
        return {
          valid: false,
          message: `The item "${dish?.name ?? "Selected dish"}" is currently unavailable.`,
        };
      }

      let unitPrice = dish.price;
      let variantName: string | null = null;
      let variantId: string | null = null;

      if (item.variantId) {
        const variant = dish.variants.find(
          (opt) => opt.id === item.variantId && opt.isAvailable,
        );
        if (!variant) {
          return {
            valid: false,
            message: `The selected option for "${dish.name}" is unavailable.`,
          };
        }
        unitPrice += variant.priceDelta;
        variantName = variant.name;
        variantId = variant.id;
      }

      const validAddOnIds = new Set(dish.addOns.map(({ addOn }) => addOn.id));
      const requestedAddOnIds = item.addOnIds ?? [];
      const selectedAddOns = requestedAddOnIds.map((id) => {
        if (!validAddOnIds.has(id)) return null;
        return dish.addOns.find(({ addOn }) => addOn.id === id)?.addOn ?? null;
      });

      if (selectedAddOns.some((addOn) => addOn === null || !addOn.isActive)) {
        return {
          valid: false,
          message: `One of the selected extras for "${dish.name}" is unavailable.`,
        };
      }

      const addOns = selectedAddOns
        .filter((addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn))
        .map((a) => ({ id: a.id, name: a.name, price: a.price }));

      unitPrice += addOns.reduce((sum, addOn) => sum + addOn.price, 0);
      const quantity = Math.min(20, Math.max(1, Math.round(item.quantity)));

      validatedLines.push({
        dishId: dish.id,
        name: dish.name,
        variantId,
        variantName,
        addOns,
        instructions: item.instructions?.trim() || null,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      });
    }

    const subtotal = validatedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const itemCount = validatedLines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      valid: true,
      items: validatedLines,
      subtotal,
      itemCount,
    };
  }
}

export const cartService = new CartService();
