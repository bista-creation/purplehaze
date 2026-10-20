import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  PartyPopper,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

const statusVariant = (status: string) =>
  status === "CONFIRMED"
    ? "green"
    : status === "CANCELLED"
      ? "red"
      : status === "COMPLETED"
        ? "blue"
        : "gold";

export default async function AccountBookingsPage() {
  const user = await requireUser();
  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.eventBooking.findMany({
      where: { userId: user.id },
      orderBy: { eventDate: "desc" },
      include: { venue: true },
    }),
  ]);

  return (
    <div>
      <div>
        <p className="eyebrow">Your plans</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">My bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Table requests and event enquiries linked to your account.
        </p>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <CalendarCheck className="size-5 text-primary" /> Table reservations
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/reservations">Reserve a table</Link>
          </Button>
        </div>
        {reservations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarDays}
              title="No table requests yet"
              description="A slow lunch or a garden dinner starts with a date. Send us a request and we will confirm availability."
              actionLabel="Request a table"
              actionHref="/reservations"
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(reservation.status)}>
                        {reservation.status}
                      </Badge>
                      {reservation.occasion ? (
                        <span className="text-xs text-muted-foreground">
                          {reservation.occasion}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-display text-xl font-semibold">
                      {formatDateTime(reservation.date)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UsersRound className="size-3.5" />
                      {reservation.guests} guest
                      {reservation.guests === 1 ? "" : "s"}
                      <span className="mx-1">·</span>
                      <Clock className="size-3.5" /> Requested{" "}
                      {formatDateTime(reservation.createdAt)}
                    </p>
                    {reservation.notes ? (
                      <p className="mt-2 max-w-xl rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        {reservation.notes}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/contact">Change or ask</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <PartyPopper className="size-5 text-primary" /> Event enquiries
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/events">Plan an event</Link>
          </Button>
        </div>
        {events.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={PartyPopper}
              title="No event enquiries yet"
              description="Planning a birthday, reception or team meeting? Tell our events team what you have in mind."
              actionLabel="Explore venues"
              actionHref="/events"
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(event.status)}>
                        {event.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {event.eventType}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-xl font-semibold">
                      {formatDateTime(event.eventDate)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <UsersRound className="size-3.5" /> {event.guests} guests
                      {event.venue ? (
                        <>
                          <span className="mx-1">·</span>
                          {event.venue.name}
                        </>
                      ) : (
                        <>
                          <span className="mx-1">·</span>
                          Venue to be discussed
                        </>
                      )}
                    </p>
                    {event.message ? (
                      <p className="mt-2 max-w-xl rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        {event.message}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/contact">Message the team</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-5 text-xs leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">A note on confirmations</p>
        <p className="mt-1">
          A request is not confirmed until our team contacts you. For urgent
          changes to a booking, please call the restaurant rather than relying on
          the website.
        </p>
      </div>
    </div>
  );
}
