import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { reservationSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view your reservations.", 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const status = searchParams.get("status") || undefined;

  const result = await bookingService.listReservations({
    userId: user.id,
    status,
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
  const ip = await getClientIp();
  const limit = await checkRateLimit(`api:reservations:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.success) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many reservation requests. Please wait.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const user = await getAuthContext(req);

  try {
    const reservation = await bookingService.createReservation(parsed.data, user?.id);
    return jsonOk(reservation, undefined, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create reservation.";
    return jsonError("BOOKING_FAILED", msg, 400);
  }
}
