import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MapPin,
  MessageSquareText,
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
import { EventCalendar } from "@/components/admin/event-calendar";
import { deleteEventBookingAction } from "@/actions/admin/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";
import { BOOKING_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Event bookings" };
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

export default async function AdminEventBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    venue?: string;
    when?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireStaff("/admin/event-bookings");
  const params = await searchParams;
  const status = BOOKING_STATUSES.includes(
    params.status as (typeof BOOKING_STATUSES)[number],
  )
    ? params.status
    : "ALL";
  const when = ["upcoming", "past", "all"].includes(params.when ?? "")
    ? (params.when as "upcoming" | "past" | "all")
    : "upcoming";
  const venueId = params.venue && params.venue !== "ALL" ? params.venue : "";
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const now = new Date();

  const dateFilter =
    when === "upcoming"
      ? { eventDate: { gte: now } }
      : when === "past"
        ? { eventDate: { lt: now } }
        : {};
  const where = {
    ...dateFilter,
    ...(status !== "ALL" ? { status } : {}),
    ...(venueId ? { venueId } : {}),
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

  type BookingItem = Prisma.EventBookingGetPayload<{
    include: { venue: { select: { name: true } } };
  }>;
  type VenueOption = { id: string; name: string };
  type CalendarItem = {
    id: string;
    name: string;
    eventType: string;
    eventDate: Date;
    guests: number;
    status: string;
    venue: { name: string } | null;
  };

  let bookings: BookingItem[] = [];
  let total = 0;
  let pendingCount = 0;
  let venues: VenueOption[] = [];
  let calendarRows: CalendarItem[] = [];

  try {
    const [b, t, p, v, c] = await Promise.all([
    prisma.eventBooking.findMany({
      where,
      orderBy: { eventDate: when === "past" ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { venue: { select: { name: true } } },
    }),
    prisma.eventBooking.count({ where }),
    prisma.eventBooking.count({
      where: { status: "PENDING", eventDate: { gte: now } },
    }),
    prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.eventBooking.findMany({
      where: { eventDate: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) } },
      orderBy: { eventDate: "asc" },
      take: 500,
      select: {
        id: true,
        name: true,
        eventType: true,
        eventDate: true,
        guests: true,
        status: true,
        venue: { select: { name: true } },
      },
    }),
    ]);
    bookings = b;
    total = t;
    pendingCount = p;
    venues = v;
    calendarRows = c;
  } catch {
    console.warn("Database offline in AdminEventBookingsPage; using empty list.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: { page?: number }) {
    const query = new URLSearchParams();
    if (status !== "ALL") query.set("status", String(status));
    if (when !== "upcoming") query.set("when", when);
    if (venueId) query.set("venue", venueId);
    if (q) query.set("q", q);
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/event-bookings?${query}` : "/admin/event-bookings";
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Events & venues"
        title="Event bookings"
        description={`${pendingCount} event enquir${pendingCount === 1 ? "y" : "ies"} awaiting a reply. Event dates are shown in Nepal time.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/admin/reports/events?status=${status}&when=${when}`}>
              <Download className="size-3.5" /> Export CSV
            </Link>
          </Button>
        }
      />

      <div className="mb-5">
        <EventCalendar
          bookings={calendarRows.map((booking) => ({
            id: booking.id,
            name: booking.name,
            eventType: booking.eventType,
            eventDate: booking.eventDate.toISOString(),
            guests: booking.guests,
            status: booking.status,
            venueName: booking.venue?.name ?? null,
          }))}
        />
      </div>

      <AdminCard className="mb-4 p-4">
        <form action="/admin/event-bookings" method="GET" className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="event-search" className="mb-1.5 block text-xs font-semibold">
              Search
            </label>
            <Input
              id="event-search"
              name="q"
              defaultValue={q}
              placeholder="Name, email or phone"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="event-status" className="mb-1.5 block text-xs font-semibold">Status</label>
              <select
                id="event-status"
                name="status"
                defaultValue={status}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="ALL">All</option>
                {BOOKING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-venue" className="mb-1.5 block text-xs font-semibold">Venue</label>
              <select
                id="event-venue"
                name="venue"
                defaultValue={venueId || "ALL"}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="ALL">All</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-when" className="mb-1.5 block text-xs font-semibold">When</label>
              <select
                id="event-when"
                name="when"
                defaultValue={when}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline">Apply filters</Button>
        </form>
      </AdminCard>

      {bookings.length === 0 ? (
        <AdminEmpty
          title="No event enquiries found"
          description="Enquiries submitted through the Events & Venues page will appear here, with their requested date and guest count."
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <AdminCard key={booking.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                    <p className="font-display text-lg font-semibold">{booking.name}</p>
                    <Badge variant="violet">{booking.eventType}</Badge>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <CalendarDays className="size-4 text-primary" />
                    {formatDateTime(booking.eventDate)}
                    <span className="text-muted-foreground">·</span>
                    <UsersRound className="size-4 text-primary" />
                    {booking.guests} guests
                    {booking.venue ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <MapPin className="size-4 text-primary" />
                        {booking.venue.name}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Venue to discuss</span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Phone className="size-3.5" /> {booking.phone}
                    </a>
                    <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Mail className="size-3.5" /> {booking.email}
                    </a>
                    <span>Enquired {formatDateTime(booking.createdAt)}</span>
                  </div>
                  {booking.message ? (
                    <p className="mt-2 max-w-3xl rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5">
                      <span className="font-semibold">Enquiry:</span> {booking.message}
                    </p>
                  ) : null}
                  {booking.adminNotes ? (
                    <p className="mt-2 max-w-3xl rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5">
                      <span className="font-semibold">Internal:</span> {booking.adminNotes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <BookingStatusButton
                    kind="event"
                    id={booking.id}
                    currentStatus={booking.status}
                    adminNotes={booking.adminNotes}
                    label="Manage"
                  />
                  <Button asChild variant="ghost" size="sm">
                    <a href={`mailto:${booking.email}?subject=${encodeURIComponent(`Purple Haze event enquiry — ${booking.name}`)}`}>
                      <MessageSquareText className="size-3.5" /> Email
                    </a>
                  </Button>
                  <ConfirmActionButton
                    action={deleteEventBookingAction.bind(null, booking.id)}
                    label="Delete"
                    title="Delete this event enquiry?"
                    description="This permanently removes the enquiry. Cancelled enquiries should usually be kept for records."
                    confirmLabel="Delete enquiry"
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
            Page {page} of {totalPages} · {total} enquiries
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
