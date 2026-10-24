import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Phone,
  UsersRound,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { BookingStatusButton } from "@/components/admin/booking-status-button";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteReservationAction } from "@/actions/admin/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import type { Reservation } from "@prisma/client";
import { requireStaff } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";
import { BOOKING_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  return status === "CONFIRMED"
    ? ("green" as const)
    : status === "CANCELLED"
      ? ("red" as const)
      : status === "COMPLETED"
        ? ("blue" as const)
        : ("gold" as const);
}

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    when?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireStaff("/admin/reservations");
  const params = await searchParams;
  const status = BOOKING_STATUSES.includes(
    params.status as (typeof BOOKING_STATUSES)[number],
  )
    ? params.status
    : "ALL";
  const when = ["upcoming", "past", "all"].includes(params.when ?? "")
    ? (params.when as "upcoming" | "past" | "all")
    : "upcoming";
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const now = new Date();

  const dateFilter =
    when === "upcoming"
      ? { date: { gte: now } }
      : when === "past"
        ? { date: { lt: now } }
        : {};
  const where = {
    ...dateFilter,
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  let reservations: Reservation[] = [];
  let total = 0;
  let pendingCount = 0;
  let todayCount = 0;

  try {
    const [r, t, p, td] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { date: when === "past" ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.reservation.count({ where }),
    prisma.reservation.count({ where: { status: "PENDING", date: { gte: now } } }),
    prisma.reservation.count({
      where: {
        date: {
          gte: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00+05:45`),
          lt: new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59+05:45`),
        },
      },
    }),
    ]);
    reservations = r;
    total = t;
    pendingCount = p;
    todayCount = td;
  } catch {
    console.warn("Database offline in AdminReservationsPage; using empty list.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: { page?: number }) {
    const query = new URLSearchParams();
    if (status !== "ALL") query.set("status", String(status));
    if (when !== "upcoming") query.set("when", when);
    if (q) query.set("q", q);
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/reservations?${query}` : "/admin/reservations";
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Service floor"
        title="Reservations"
        description={`${pendingCount} table request${pendingCount === 1 ? "" : "s"} awaiting confirmation. A request is not a confirmed table until your team marks it confirmed.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/admin/reports/reservations?status=${status}&when=${when}`}>
              <Download className="size-3.5" /> Export CSV
            </Link>
          </Button>
        }
      />

      <AdminCard className="mb-4 p-4">
        <form action="/admin/reservations" method="GET" className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="reservation-search" className="mb-1.5 block text-xs font-semibold">
              Search
            </label>
            <Input
              id="reservation-search"
              name="q"
              defaultValue={q}
              placeholder="Guest name, email or phone"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reservation-status" className="mb-1.5 block text-xs font-semibold">
                Status
              </label>
              <select
                id="reservation-status"
                name="status"
                defaultValue={status}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">All statuses</option>
                {BOOKING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reservation-when" className="mb-1.5 block text-xs font-semibold">
                When
              </label>
              <select
                id="reservation-when"
                name="when"
                defaultValue={when}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline">Apply filters</Button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {todayCount} reservation{todayCount === 1 ? "" : "s"} dated today (Nepal time).
        </p>
      </AdminCard>

      {reservations.length === 0 ? (
        <AdminEmpty
          title="No reservations found"
          description="New table requests from the website will appear here with their contact details and notes."
        />
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <AdminCard key={reservation.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(reservation.status)}>
                      {reservation.status}
                    </Badge>
                    <p className="font-display text-lg font-semibold">{reservation.name}</p>
                    {reservation.occasion ? (
                      <Badge variant="violet">{reservation.occasion}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <CalendarCheck2 className="size-4 text-primary" />
                    {formatDateTime(reservation.date)}
                    <span className="text-muted-foreground">·</span>
                    <UsersRound className="size-4 text-primary" />
                    {reservation.guests} guest{reservation.guests === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a href={`tel:${reservation.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Phone className="size-3.5" /> {reservation.phone}
                    </a>
                    <a href={`mailto:${reservation.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Mail className="size-3.5" /> {reservation.email}
                    </a>
                    <span>Requested {formatDateTime(reservation.createdAt)}</span>
                  </div>
                  {reservation.notes ? (
                    <p className="mt-2 max-w-3xl rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5">
                      <span className="font-semibold">Guest note:</span> {reservation.notes}
                    </p>
                  ) : null}
                  {reservation.adminNotes ? (
                    <p className="mt-2 max-w-3xl rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5">
                      <span className="font-semibold">Internal:</span> {reservation.adminNotes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <BookingStatusButton
                    kind="reservation"
                    id={reservation.id}
                    currentStatus={reservation.status}
                    adminNotes={reservation.adminNotes}
                    label="Manage"
                  />
                  <ConfirmActionButton
                    action={deleteReservationAction.bind(null, reservation.id)}
                    label="Delete"
                    title="Delete this reservation?"
                    description="This permanently removes the request. Confirmed tables should usually be cancelled instead so there is a record."
                    confirmLabel="Delete reservation"
                    variant="ghost"
                  />
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} reservations
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={href({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Link href={href({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
