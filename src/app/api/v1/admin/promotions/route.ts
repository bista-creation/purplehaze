import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { couponAdminSchema } from "@/lib/validations";
import { parseNepalDateTime } from "@/lib/time";
import { rupeesToPaisa } from "@/lib/money";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(coupons);
}

export async function POST(req: NextRequest) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = couponAdminSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  if (parsed.data.type === "PERCENT" && parsed.data.value > 100) {
    return jsonError("BAD_REQUEST", "A percentage cannot exceed 100.", 400);
  }

  const existing = await prisma.coupon.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return jsonError("CONFLICT", "That coupon code already exists.", 409);
  }

  const startsAt = parsed.data.startsAt
    ? parseNepalDateTime(parsed.data.startsAt)
    : null;
  const expiresAt = parsed.data.expiresAt
    ? parseNepalDateTime(parsed.data.expiresAt)
    : null;

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      description: parsed.data.description || null,
      type: parsed.data.type,
      value:
        parsed.data.type === "FIXED"
          ? rupeesToPaisa(parsed.data.value)
          : Math.round(parsed.data.value),
      minOrder: rupeesToPaisa(parsed.data.minOrder ?? 0),
      maxDiscount:
        parsed.data.maxDiscount && parsed.data.maxDiscount > 0
          ? rupeesToPaisa(parsed.data.maxDiscount)
          : null,
      startsAt,
      expiresAt,
      maxUses:
        parsed.data.maxUses && parsed.data.maxUses > 0
          ? parsed.data.maxUses
          : null,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "coupon.create",
    entity: "Coupon",
    entityId: coupon.id,
    details: { code: coupon.code },
  });

  return jsonOk(coupon, undefined, 201);
}
