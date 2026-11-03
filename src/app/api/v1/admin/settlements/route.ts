import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { settlementService } from "@/lib/services/settlement.service";

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || undefined;

  const result = await settlementService.listSettlementsForDate(dateStr);
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to list settlements",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}
