import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { orderQuerySchema } from "@/lib/shared/schemas";
import { jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const { searchParams } = new URL(req.url);
  const parsed = orderQuerySchema.safeParse({
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const { page, limit, status, type, search } = parsed.data;
  const result = await orderService.listOrders({
    status,
    type,
    search,
    page,
    limit,
  });

  return jsonOk(result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
}
