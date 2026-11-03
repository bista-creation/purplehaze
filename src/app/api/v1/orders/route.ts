import { NextRequest } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { getAuthContext, checkCsrfOrigin } from "@/lib/api/auth-context";
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
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:orders:${ip}`, 10, 10 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many order requests. Please wait a few minutes.", 429);
    }

    const csrf = checkCsrfOrigin(req);
    if (!csrf.valid) {
      return csrf.errorResponse!;
    }

    const idempotencyHeader = req.headers.get("idempotency-key")?.trim();
    const body = await req.json().catch(() => null);
    const user = await getAuthContext(req);

    if (idempotencyHeader) {
      const cachedResponse = await checkIdempotency(req, "/api/v1/orders", {
        userId: user?.id,
        payload: body,
      });
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const parsed = createOrderSchema.safeParse({
      ...body,
      idempotencyKey: idempotencyHeader || body?.idempotencyKey,
    });

    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

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
      await recordIdempotency(
        idempotencyHeader,
        "/api/v1/orders",
        user?.id,
        201,
        responsePayload,
        body,
      );
    }

    return jsonOk(responsePayload, undefined, 201);
  } catch (error) {
    console.error("Order creation API error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to place order.", 500);
  }
}
