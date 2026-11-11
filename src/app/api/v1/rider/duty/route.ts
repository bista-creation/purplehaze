import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const dutySchema = z.object({
  status: z.enum(["ON_DUTY", "OFF_DUTY"]),
});

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  const result = await riderService.getRiderDutyStatus(user.id);
  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to retrieve duty status",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = dutySchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await riderService.setDutyStatus(user.id, parsed.data.status);
    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to update duty status",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
