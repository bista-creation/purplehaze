import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const updateRiderSchema = z.object({
  isBlocked: z.boolean(),
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminOnlyAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const riderProfileId = params.id;
  if (!riderProfileId) {
    return jsonError("BAD_REQUEST", "Rider ID is required", 400);
  }

  const result = await riderService.getRiderAdminDetails(riderProfileId, {
    id: user.id,
    email: user.email,
  });

  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to retrieve rider details",
      result.error?.statusCode || 404
    );
  }

  return jsonOk(result.data);
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminOnlyAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const riderProfileId = params.id;
  if (!riderProfileId) {
    return jsonError("BAD_REQUEST", "Rider ID is required", 400);
  }

  try {
    const body = await req.json();
    const parsed = updateRiderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await riderService.setRiderBlockedStatus(
      riderProfileId,
      parsed.data.isBlocked,
      {
        id: user.id,
        email: user.email,
      }
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to update rider status",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
