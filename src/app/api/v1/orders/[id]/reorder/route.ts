import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Order ID is required.", 400);
  }

  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to reorder items.", 401);
  }

  const result = await orderService.getReorderLines(id, user.id);
  if (!result.success) {
    return jsonError("REORDER_FAILED", result.message, 400);
  }

  return jsonOk(result);
}
