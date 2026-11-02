import { NextRequest } from "next/server";
import { z } from "zod";
import { orderService } from "@/lib/services/order.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const trackQuerySchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  phone: z.string().min(6, "Phone number is required"),
});

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`api:track:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.success) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many tracking attempts. Please wait.", 429);
  }

  const { searchParams } = new URL(req.url);
  const parsed = trackQuerySchema.safeParse({
    orderNumber: searchParams.get("orderNumber") ?? "",
    phone: searchParams.get("phone") ?? "",
  });

  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const order = await orderService.trackOrder(parsed.data.orderNumber, parsed.data.phone);
  if (!order) {
    return jsonError(
      "NOT_FOUND",
      "No order matching those details was found. Please verify the order number and phone.",
      404,
    );
  }

  return jsonOk(order);
}
