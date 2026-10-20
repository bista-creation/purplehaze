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
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const now = new Date();

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(when === "upcoming" ? { date: { gte: now } } : {}),
      ...(when === "past" ? { date: { lt: now } } : {}),
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
    orderBy: { date: "desc" },
    take: 10_000,
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.reservations",
    entity: "Reservation",
    details: { rows: reservations.length, status, when, q: q || null, range },
  });

  const body = toCsv(
    [
      { key: "reservedFor", label: "Reserved for (Nepal)" },
      { key: "name", label: "Guest" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "guests", label: "Guests" },
      { key: "occasion", label: "Occasion" },
      { key: "status", label: "Status" },
      { key: "tableNumber", label: "Table" },
      { key: "notes", label: "Guest note" },
      { key: "adminNotes", label: "Internal notes" },
      { key: "createdAt", label: "Requested at" },
    ],
    reservations.map((reservation) => ({
      reservedFor: formatDateTime(reservation.date),
      name: reservation.name,
      phone: reservation.phone,
      email: reservation.email,
      guests: reservation.guests,
      occasion: reservation.occasion ?? "",
      status: reservation.status,
      tableNumber: reservation.tableNumber ?? "",
      notes: reservation.notes ?? "",
      adminNotes: reservation.adminNotes ?? "",
      createdAt: formatDateTime(reservation.createdAt),
    })),
  );

  return csvResponse(
    `purple-haze-reservations${range ? `-${range.fromDay}-to-${range.toDay}` : ""}.csv`,
    body,
  );
}
