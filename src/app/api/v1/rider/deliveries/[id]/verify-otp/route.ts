import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Delivery OTP must be exactly 6 digits"),
  cashCollectedPaisa: z.number().int().nonnegative().optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const deliveryId = params.id;
  if (!deliveryId) {
    return jsonError("BAD_REQUEST", "Delivery ID is required", 400);
  }

  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await deliveryService.completeDeliveryWithOtp(
      deliveryId,
      user.id,
      parsed.data.otp,
      parsed.data.cashCollectedPaisa
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "OTP verification failed",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
