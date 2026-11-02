import { NextRequest } from "next/server";
import { cartService } from "@/lib/services/cart.service";
import { cartItemSchema } from "@/lib/validations";
import { z } from "zod";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart cannot be empty."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = validateCartSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await cartService.validateAndCalculateItems(parsed.data.items);
    if (!result.valid) {
      return jsonError("INVALID_CART", result.message, 400);
    }

    return jsonOk({
      items: result.items,
      subtotal: result.subtotal,
      itemCount: result.itemCount,
    });
  } catch (error) {
    console.error("Cart validation API failed:", error);
    return jsonError("INTERNAL_ERROR", "Failed to validate cart.", 500);
  }
}
