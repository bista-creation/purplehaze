import { NextRequest } from "next/server";
import { couponService } from "@/lib/services/coupon.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { z } from "zod";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const couponInputSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code."),
  subtotal: z.number().positive("Subtotal must be greater than 0."),
});

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:coupon:${ip}`, 15, 60_000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many coupon attempts. Try again shortly.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = couponInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await couponService.validateCoupon(parsed.data.code, parsed.data.subtotal);
    if (!result.valid) {
      return jsonError("INVALID_COUPON", result.message, 400);
    }

    return jsonOk({ ...result.coupon, valid: true }, { message: result.message });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to validate coupon.", 500);
  }
}
