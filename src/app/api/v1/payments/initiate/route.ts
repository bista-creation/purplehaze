import { NextRequest } from "next/server";
import { z } from "zod";
import { mobilePaymentService } from "@/lib/services/mobile-payment.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const initiateSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  provider: z.enum(["ESEWA", "KHALTI"]),
  appScheme: z.string().default("purplehaze"),
  token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const { orderId, provider, appScheme, token } = parsed.data;
  const user = await getAuthContext(req);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, publicToken: true },
  });

  if (!order) {
    return jsonError("NOT_FOUND", "Order not found.", 404);
  }

  const isOwner =
    (user && order.userId === user.id) ||
    (token && order.publicToken === token);

  if (!isOwner && user?.role !== "ADMIN" && user?.role !== "STAFF") {
    return jsonError("FORBIDDEN", "You do not have access to this order.", 403);
  }

  try {
    const paymentData = await mobilePaymentService.initiatePayment(orderId, provider, appScheme);
    return jsonOk(paymentData);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to initiate payment.";
    return jsonError("PAYMENT_INITIATION_FAILED", msg, 400);
  }
}
