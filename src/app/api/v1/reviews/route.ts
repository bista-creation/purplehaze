import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const reviewSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  token: z.string().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(100).optional().nullable(),
  comment: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`api:reviews:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.success) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many review attempts. Please wait.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const user = await getAuthContext(req);
  const { orderId, token, rating, title, comment } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { review: true },
  });

  if (!order) {
    return jsonError("NOT_FOUND", "Order not found.", 404);
  }

  const isOwner =
    (user && order.userId === user.id) ||
    (token && order.publicToken === token);

  if (!isOwner) {
    return jsonError("FORBIDDEN", "You cannot review this order.", 403);
  }

  if (order.status !== "COMPLETED") {
    return jsonError("ORDER_NOT_COMPLETED", "You can leave a review once your order is completed.", 400);
  }

  if (order.review) {
    return jsonError("ALREADY_REVIEWED", "You have already reviewed this order.", 409);
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        userId: user?.id ?? order.userId,
        orderId: order.id,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        isApproved: false,
      },
    });

    await tx.notification.upsert({
      where: { eventKey: `review:${created.id}:created` },
      update: {},
      create: {
        eventKey: `review:${created.id}:created`,
        type: "REVIEW",
        title: "New review awaiting moderation",
        message: `Order ${order.orderNumber} · review awaiting moderation.`,
        link: "/admin/reviews",
        orderId: order.id,
        isTest: order.isTest,
      },
    });

    return created;
  });

  await writeAuditLog({
    userId: user?.id ?? order.userId ?? undefined,
    actorEmail: user?.email ?? order.customerEmail,
    action: "review.submit",
    entity: "Review",
    entityId: review.id,
    details: { orderNumber: order.orderNumber, rating },
  });

  return jsonOk({
    reviewId: review.id,
    message: "Thank you — your review has been submitted for moderation.",
  }, undefined, 201);
}
