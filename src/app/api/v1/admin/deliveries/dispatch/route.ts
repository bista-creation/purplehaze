import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const dispatchSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  riderProfileId: z.string().min(1, "Rider ID is required"),
});

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = dispatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await deliveryService.dispatchOrder(
      parsed.data.orderId,
      parsed.data.riderProfileId,
      {
        id: user.id,
        email: user.email,
      }
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to dispatch order",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data, undefined, 201);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
