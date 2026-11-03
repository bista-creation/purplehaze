import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const overrideSchema = z.object({
  newStatus: z.enum(["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER", "DELIVERED", "FAILED", "DECLINED"]),
  reason: z.string().min(5, "A written justification (min 5 characters) is required for admin overrides."),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminOnlyAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const deliveryId = params.id;
  if (!deliveryId) {
    return jsonError("BAD_REQUEST", "Delivery ID is required", 400);
  }

  try {
    const body = await req.json();
    const parsed = overrideSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await deliveryService.adminOverride(
      deliveryId,
      parsed.data.newStatus,
      parsed.data.reason,
      {
        id: user.id,
        email: user.email,
      }
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to override delivery",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
