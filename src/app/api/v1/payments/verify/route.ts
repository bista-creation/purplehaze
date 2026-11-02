import { NextRequest } from "next/server";
import { z } from "zod";
import { mobilePaymentService } from "@/lib/services/mobile-payment.service";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const verifySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  provider: z.enum(["ESEWA", "KHALTI"]),
  data: z.string().optional(), // For eSewa base64 data
  pidx: z.string().optional(), // For Khalti pidx
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const { orderId, provider, data, pidx } = parsed.data;

  if (provider === "ESEWA") {
    if (!data) {
      return jsonError("BAD_REQUEST", "eSewa verification requires callback data.", 400);
    }
    const result = await mobilePaymentService.handleEsewaCallback(orderId, data);
    if (!result.success) {
      return jsonError("VERIFICATION_FAILED", result.reason ?? "eSewa verification failed.", 400);
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, paymentStatus: true, status: true },
    });
    return jsonOk({ verified: true, order });
  }

  if (provider === "KHALTI") {
    if (!pidx) {
      return jsonError("BAD_REQUEST", "Khalti verification requires pidx.", 400);
    }
    const result = await mobilePaymentService.handleKhaltiCallback(orderId, pidx);
    if (!result.success) {
      return jsonError("VERIFICATION_FAILED", result.reason ?? "Khalti verification failed.", 400);
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, paymentStatus: true, status: true },
    });
    return jsonOk({ verified: true, order });
  }

  return jsonError("BAD_REQUEST", "Unsupported provider.", 400);
}
