import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const failDeliverySchema = z.object({
  reason: z.string().min(3, "Failure reason is required"),
  notes: z.string().optional(),
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
    const parsed = failDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await deliveryService.recordDeliveryFailure(
      deliveryId,
      user.id,
      parsed.data.reason,
      parsed.data.notes
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to record delivery failure",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
