import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Order ID is required.", 400);
  }

  const user = await getAuthContext(req);
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Admin or staff can view any order
  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  const order = await orderService.getOrderById(id, isStaffOrAdmin ? undefined : user?.id);

  if (!order) {
    // Check if accessible by public token
    if (token) {
      const byToken = await orderService.getOrderByNumber(id, null, token);
      if (byToken) {
        return jsonOk(byToken);
      }
    }
    return jsonError("NOT_FOUND", "Order not found or access denied.", 404);
  }

  return jsonOk(order);
}
