import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { CouponAdmin } from "@/components/admin/coupon-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdmin("/admin/coupons");
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Marketing"
        title="Coupons"
        description="Create percentage or fixed discounts, cap them, and set a Nepal-time start and expiry. Usage is counted when an order is successfully placed."
      />
      <CouponAdmin
        coupons={coupons.map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          minOrder: coupon.minOrder,
          maxDiscount: coupon.maxDiscount,
          maxUses: coupon.maxUses,
          usedCount: coupon.usedCount,
          startsAt: coupon.startsAt?.toISOString() ?? null,
          expiresAt: coupon.expiresAt?.toISOString() ?? null,
          isActive: coupon.isActive,
        }))}
      />
    </>
  );
}
