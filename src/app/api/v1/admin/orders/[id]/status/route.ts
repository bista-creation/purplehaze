import { NextRequest } from "next/server";
import { z } from "zod";
import { orderService } from "@/lib/services/order.service";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(300).optional(),
});

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Order ID is required.", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const result = await orderService.updateOrderStatus(
    id,
    parsed.data.status as OrderStatus,
    authCheck.user.name || authCheck.user.email,
    parsed.data.note,
  );

  if (!result.success) {
    return jsonError("STATUS_UPDATE_FAILED", result.message, 400);
  }

  return jsonOk({ message: result.message, order: result.order });
}
