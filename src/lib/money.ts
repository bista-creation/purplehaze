export function formatNPR(
  paisa: number,
  options: { showDecimals?: boolean; withSymbol?: boolean } = {},
) {
  const { showDecimals = paisa % 100 !== 0, withSymbol = true } = options;
  const rupees = paisa / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
  return withSymbol ? `Rs ${formatted}` : formatted;
}

export function formatNPRRange(min: number, max: number) {
  return `${formatNPR(min)} – ${formatNPR(max)}`;
}

export function rupeesToPaisa(rupees: number) {
  return Math.round(rupees * 100);
}

export function paisaToRupees(paisa: number) {
  return paisa / 100;
}

export function percentOf(amount: number, percent: number) {
  return Math.round((amount * percent) / 100);
}

export interface TotalsInput {
  subtotal: number;
  deliveryFee?: number;
  discountAmount?: number;
  taxRate?: number;
  serviceChargeRate?: number;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  serviceCharge: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/**
 * All amounts are integers in paisa. Tax is calculated on food + service charge
 * after discount, and delivery fees are passed through without VAT.
 */
export function calculateOrderTotals({
  subtotal,
  deliveryFee = 0,
  discountAmount = 0,
  taxRate = 13,
  serviceChargeRate = 0,
}: TotalsInput): OrderTotals {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeDiscount = Math.min(
    Math.max(0, Math.round(discountAmount)),
    safeSubtotal,
  );
  const serviceCharge = percentOf(
    safeSubtotal - safeDiscount,
    Math.max(0, serviceChargeRate),
  );
  const taxable = safeSubtotal - safeDiscount + serviceCharge;
  const taxAmount = percentOf(taxable, Math.max(0, taxRate));
  return {
    subtotal: safeSubtotal,
    deliveryFee: Math.max(0, Math.round(deliveryFee)),
    serviceCharge,
    discountAmount: safeDiscount,
    taxAmount,
    total:
      safeSubtotal -
      safeDiscount +
      serviceCharge +
      taxAmount +
      Math.max(0, Math.round(deliveryFee)),
  };
}

export function calculateCouponDiscount(
  coupon: {
    type: string;
    value: number;
    minOrder: number;
    maxDiscount: number | null;
    startsAt?: Date | null;
    expiresAt?: Date | null;
    maxUses?: number | null;
    usedCount?: number;
    isActive?: boolean;
  },
  subtotal: number,
  now = new Date(),
) {
  if (coupon.isActive === false) {
    return { valid: false as const, reason: "This coupon is no longer active." };
  }
  if (subtotal < coupon.minOrder) {
    return {
      valid: false as const,
      reason: `This coupon needs a minimum order of ${formatNPR(coupon.minOrder)}.`,
    };
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    return {
      valid: false as const,
      reason: "This coupon is not active yet.",
    };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false as const, reason: "This coupon has expired." };
  }
  if (
    coupon.maxUses !== null &&
    coupon.maxUses !== undefined &&
    (coupon.usedCount ?? 0) >= coupon.maxUses
  ) {
    return {
      valid: false as const,
      reason: "This coupon has reached its usage limit.",
    };
  }

  let discount =
    coupon.type === "PERCENT"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;

  if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, subtotal);

  if (discount <= 0) {
    return { valid: false as const, reason: "This coupon has no value." };
  }

  return { valid: true as const, discount };
}
