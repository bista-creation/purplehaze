import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateCouponDiscount, formatNPR } from "@/lib/money";

export type CouponValidationResult =
  | {
      valid: true;
      coupon: {
        id: string;
        code: string;
        description: string | null;
        type: string;
        value: number;
        discount: number;
      };
      message: string;
    }
  | {
      valid: false;
      message: string;
    };

export class CouponService {
  async validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { valid: false, message: "Enter a coupon code." };
    }
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return { valid: false, message: "Add something to your cart first." };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: trimmed },
    });

    if (!coupon) {
      return { valid: false, message: "That coupon code was not found." };
    }

    const result = calculateCouponDiscount(coupon, subtotal);
    if (!result.valid) {
      return { valid: false, message: result.reason };
    }

    const message =
      coupon.type === "PERCENT"
        ? `${coupon.value}% off applied (${formatNPR(result.discount)} savings).`
        : `${formatNPR(result.discount)} discount applied.`;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        discount: result.discount,
      },
      message,
    };
  }

  async incrementUsage(couponId: string) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
}

export const couponService = new CouponService();
