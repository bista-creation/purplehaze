import { NextRequest } from "next/server";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const orderId = params.id;
  if (!orderId) {
    return jsonError("BAD_REQUEST", "Order ID is required", 400);
  }

  const result = await riderService.logCall(user.id, orderId);
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to log customer call",
      result.error?.statusCode || 400
    );
  }

  return jsonOk({ success: true, message: "Call audit logged" });
}
