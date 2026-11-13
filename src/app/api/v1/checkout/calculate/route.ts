import { NextRequest } from "next/server";
import { cartService } from "@/lib/services/cart.service";
import { couponService } from "@/lib/services/coupon.service";
import { getPublicSettings } from "@/lib/settings";
import { calculateOrderTotals } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { cartItemSchema } from "@/lib/validations";
import { z } from "zod";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { getAuthContext } from "@/lib/api/auth-context";
import {
  calculateLoyaltyDiscount,
  getLoyaltySummary,
  LOYALTY_REDEMPTION_PERCENT,
  LOYALTY_REDEMPTION_POINTS,
} from "@/lib/services/loyalty.service";

const calculateCheckoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart cannot be empty."),
  type: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
  zoneId: z.string().optional(),
  couponCode: z.string().optional(),
  loyaltyPointsToRedeem: z.number().int().optional().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = calculateCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const { items, type, zoneId, couponCode, loyaltyPointsToRedeem } = parsed.data;

    if (loyaltyPointsToRedeem !== 0 && loyaltyPointsToRedeem !== LOYALTY_REDEMPTION_POINTS) {
      return jsonError("INVALID_REDEMPTION", `Redeem exactly ${LOYALTY_REDEMPTION_POINTS} points at a time.`, 400);
    }
    if (loyaltyPointsToRedeem > 0 && couponCode?.trim()) {
      return jsonError("DISCOUNTS_CANNOT_STACK", "Use a coupon code or loyalty points, not both.", 400);
    }

    const user = loyaltyPointsToRedeem > 0 ? await getAuthContext(req) : null;
    if (loyaltyPointsToRedeem > 0 && (!user || user.role !== "CUSTOMER")) {
      return jsonError("LOYALTY_SIGN_IN_REQUIRED", "Sign in to redeem loyalty points.", 401);
    }

    // 1. Calculate items with server prices
    const cartCalc = await cartService.validateAndCalculateItems(items);
    if (!cartCalc.valid) {
      return jsonError("INVALID_CART", cartCalc.message, 400);
    }

    const subtotal = cartCalc.subtotal;
    const settings = await getPublicSettings();

    // 2. Delivery zone & fee
    let deliveryFee = 0;
    let zoneName: string | null = null;
    let minOrder = settings.minDeliveryOrder;

    if (type === "DELIVERY") {
      let zone = zoneId
        ? await prisma.deliveryZone.findFirst({
            where: { id: zoneId, isActive: true },
          })
        : null;
      if (!zone) {
        zone = await prisma.deliveryZone.findFirst({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        });
      }
      if (zone) {
        deliveryFee = zone.fee;
        zoneName = zone.name;
        minOrder = Math.max(minOrder, zone.minOrder);
      }
    }

    // 3. Coupon calculation
    let discountAmount = 0;
    let appliedCoupon: { code: string; discount: number } | null = null;

    if (couponCode) {
      const couponRes = await couponService.validateCoupon(couponCode, subtotal);
      if (couponRes.valid) {
        discountAmount = couponRes.coupon.discount;
        appliedCoupon = {
          code: couponRes.coupon.code,
          discount: couponRes.coupon.discount,
        };
      }
    }

    let loyaltyDiscountAmount = 0;
    let loyaltyPointsBalance: number | null = null;
    if (loyaltyPointsToRedeem > 0 && user) {
      const summary = await getLoyaltySummary(user.id);
      loyaltyPointsBalance = summary.pointsBalance;
      if (summary.pointsBalance < LOYALTY_REDEMPTION_POINTS) {
        return jsonError("INSUFFICIENT_LOYALTY_POINTS", "You need 200 points to redeem this reward.", 400);
      }
      loyaltyDiscountAmount = calculateLoyaltyDiscount(subtotal);
      discountAmount += loyaltyDiscountAmount;
    }

    // 4. Order totals in paisa
    const totals = calculateOrderTotals({
      subtotal,
      deliveryFee,
      discountAmount,
      taxRate: settings.taxRate,
      serviceChargeRate: settings.serviceChargeRate,
    });

    return jsonOk({
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      discountAmount: totals.discountAmount,
      loyaltyDiscountAmount,
      loyaltyPointsToRedeem,
      loyaltyPointsBalance,
      loyaltyRedemptionPercent: LOYALTY_REDEMPTION_PERCENT,
      taxAmount: totals.taxAmount,
      serviceCharge: totals.serviceCharge,
      total: totals.total,
      itemCount: cartCalc.itemCount,
      appliedCoupon,
      zoneName,
      minOrder,
      meetsMinOrder: subtotal >= minOrder,
    });
  } catch (error) {
    console.error("Checkout calculation API failed:", error);
    return jsonError("INTERNAL_ERROR", "Failed to calculate checkout totals.", 500);
  }
}
