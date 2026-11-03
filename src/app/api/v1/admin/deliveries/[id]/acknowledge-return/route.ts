import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const acknowledgeSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const deliveryId = params.id;
  if (!deliveryId) {
    return jsonError("BAD_REQUEST", "Delivery ID is required", 400);
  }

  let notes: string | undefined;
  try {
    const body = await req.json();
    const parsed = acknowledgeSchema.safeParse(body);
    if (parsed.success) {
      notes = parsed.data.notes;
    }
  } catch {
    // Body optional
  }

  const result = await deliveryService.acknowledgeFoodReturn(
    deliveryId,
    { id: user.id, email: user.email },
    notes
  );

  if (!result.success) {
    return jsonError(
      result.error?.code || "FAILED",
      result.error?.message || "Failed to acknowledge food return",
      result.error?.statusCode || 400
    );
  }

  return jsonOk(result.data);
}
