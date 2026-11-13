import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingService } from "@/lib/services/booking.service";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const updateReservationSchema = z.object({
  id: z.string().min(1, "Reservation ID is required"),
  status: z.enum(["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "COMPLETED"]),
  tableNumber: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const status = searchParams.get("status") || undefined;

  const result = await bookingService.listReservations({
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

export async function PUT(req: NextRequest) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  try {
    const updated = await bookingService.updateReservationStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.tableNumber,
      parsed.data.adminNotes,
      authCheck.user.email,
    );
    return jsonOk(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update reservation.";
    return jsonError("UPDATE_FAILED", msg, 400);
  }
}
