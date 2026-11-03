import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const result = await deliveryService.listDeliveriesForDispatch();
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to load deliveries",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}
