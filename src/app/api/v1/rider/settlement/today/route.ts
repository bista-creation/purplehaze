import { NextRequest } from "next/server";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { settlementService } from "@/lib/services/settlement.service";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  const result = await settlementService.getRiderTodaySettlement(user.id);
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to load settlement",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}
