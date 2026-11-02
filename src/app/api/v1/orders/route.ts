import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { checkIdempotency, recordIdempotency } from "@/lib/api/idempotency";
import { createOrderSchema } from "@/lib/validations";
import { orderQuerySchema } from "@/lib/shared/schemas";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view your orders.", 401);
  }

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
    userId: user.id,
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

export async function POST(req: NextRequest) {
  try {
    const ip = await getClientIp();
    const limit = await checkRateLimit(`api:orders:${ip}`, 10, 10 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many order requests. Please wait a few minutes.", 429);
    }

    const idempotencyHeader = req.headers.get("idempotency-key");
    const cachedResponse = await checkIdempotency(req, "/api/v1/orders");
    if (cachedResponse) {
      return cachedResponse;
    }

    const body = await req.json().catch(() => null);
    const parsed = createOrderSchema.safeParse({
      ...body,
      idempotencyKey: idempotencyHeader || body?.idempotencyKey,
    });

    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const user = await getAuthContext(req);
    const result = await orderService.createOrder(parsed.data, user);

    if (!result.success) {
      return jsonError("ORDER_CREATION_FAILED", result.message, 400);
    }

    const responsePayload = {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      publicToken: result.publicToken,
      confirmationUrl: result.confirmationUrl,
      paymentMethod: result.paymentMethod,
      digitalPayment: result.digitalPayment,
      total: result.total,
    };

    if (idempotencyHeader) {
      await recordIdempotency(idempotencyHeader, "/api/v1/orders", user?.id, 201, responsePayload);
    }

    return jsonOk(responsePayload, undefined, 201);
  } catch (error) {
    console.error("Order creation API error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to place order.", 500);
  }
}
