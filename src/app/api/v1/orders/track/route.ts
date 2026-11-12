import { NextRequest } from "next/server";
import { z } from "zod";
import { orderService } from "@/lib/services/order.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const trackQuerySchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  phone: z.string().min(6, "Phone number is required"),
});

async function handleTrack(req: NextRequest, data: { orderNumber: string; phone: string }) {
  // Block RIDER role accounts strictly from customer tracking
  const user = await getAuthContext(req);
  if (user?.role === "RIDER") {
    return jsonError("FORBIDDEN", "Riders cannot access customer tracking endpoints.", 403);
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
  const limit = await checkRateLimit(`api:track:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.success) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many tracking attempts. Please wait.", 429);
  }

  const order = await orderService.trackOrder(data.orderNumber, data.phone);
  if (!order) {
    return jsonError(
      "NOT_FOUND",
      "No order matching those details was found. Please verify the order number and phone.",
      404,
    );
  }

  // Sanitized guest tracking payload: strictly excludes customer email, full address, publicToken, and OTP
  const safeTrackingDto = {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    type: order.type,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discountAmount: order.discountAmount,
    total: order.total,
    items: order.items.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      variantName: item.variantName,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status,
      note: h.note,
      createdAt: h.createdAt,
    })),
  };

  return jsonOk(safeTrackingDto);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = trackQuerySchema.safeParse({
    orderNumber: searchParams.get("orderNumber") ?? "",
    phone: searchParams.get("phone") ?? "",
  });

  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  return handleTrack(req, parsed.data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = trackQuerySchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }
    return handleTrack(req, parsed.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON payload.", 400);
  }
}
