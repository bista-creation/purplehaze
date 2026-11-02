import { NextRequest } from "next/server";
import { z } from "zod";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const cancelSchema = z.object({
  reason: z.string().max(300).optional(),
  token: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Order ID is required.", 400);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const user = await getAuthContext(req);
  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";

  const result = await orderService.cancelOrder(
    id,
    parsed.data.reason,
    user?.id,
    parsed.data.token,
    isStaff,
  );

  if (!result.success) {
    const statusCode = result.message === "Order not found." ? 404 : 400;
    return jsonError("CANCEL_FAILED", result.message, statusCode);
  }

  return jsonOk({ message: result.message });
}
