import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { resolveReportRange } from "@/lib/report-range";
import { formatDateTime } from "@/lib/utils";
import { BOOKING_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN", "STAFF"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams, { defaultDays: null });
  const status = BOOKING_STATUSES.includes(
    searchParams.get("status") as (typeof BOOKING_STATUSES)[number],
  )
    ? searchParams.get("status")
    : null;
  const when = ["upcoming", "past"].includes(searchParams.get("when") ?? "")
    ? searchParams.get("when")
    : null;
  const venueId = (searchParams.get("venue") ?? "").trim() || null;
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const now = new Date();

  const bookings = await prisma.eventBooking.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(venueId ? { venueId } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(when === "upcoming" ? { eventDate: { gte: now } } : {}),
      ...(when === "past" ? { eventDate: { lt: now } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { eventDate: "desc" },
    take: 10_000,
    include: { venue: { select: { name: true } } },
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.events",
    entity: "EventBooking",
    details: {
      rows: bookings.length,
      status,
      when,
      venueId,
      q: q || null,
      range,
    },
  });

  const body = toCsv(
    [
      { key: "eventDate", label: "Event date (Nepal)" },
      { key: "name", label: "Contact name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "eventType", label: "Event type" },
      { key: "guests", label: "Guests" },
      { key: "venue", label: "Venue" },
      { key: "status", label: "Status" },
      { key: "message", label: "Enquiry" },
      { key: "adminNotes", label: "Internal notes" },
      { key: "createdAt", label: "Received at" },
    ],
    bookings.map((booking) => ({
      eventDate: formatDateTime(booking.eventDate),
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      eventType: booking.eventType,
      guests: booking.guests,
      venue: booking.venue?.name ?? "",
      status: booking.status,
      message: booking.message ?? "",
      adminNotes: booking.adminNotes ?? "",
      createdAt: formatDateTime(booking.createdAt),
    })),
  );

  return csvResponse(
    `purple-haze-event-bookings${range ? `-${range.fromDay}-to-${range.toDay}` : ""}.csv`,
    body,
  );
}
