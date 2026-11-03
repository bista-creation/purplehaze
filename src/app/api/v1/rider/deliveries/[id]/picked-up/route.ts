import { NextRequest } from "next/server";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

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

  const result = await deliveryService.pickupDelivery(deliveryId, user.id);
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to mark delivery picked up",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}
