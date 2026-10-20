"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  guests: number;
  status: string;
  venueName: string | null;
};

const statusColour: Record<string, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-emerald-500",
  COMPLETED: "bg-blue-500",
  CANCELLED: "bg-red-400",
};

function dateKeyInNepal(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function currentMonthInNepal() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value) - 1,
  };
}

export function EventCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [month, setMonth] = useState(currentMonthInNepal);
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of bookings) {
      const key = dateKeyInNepal(new Date(booking.eventDate));
      const list = map.get(key) ?? [];
      list.push(booking);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const firstDay = new Date(month.year, month.month, 1);
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(month.year, month.month, 1));
  const selectedBookings = selected ? (grouped.get(selected) ?? []) : [];

  function shiftMonth(offset: number) {
    const next = new Date(month.year, month.month + offset, 1);
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelected(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Event calendar
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              {monthLabel}
            </h2>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-muted/70 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {cells.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[4.6rem] bg-card/40"
                />
              );
            }
            const key = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = grouped.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(dayBookings.length > 0 ? key : null)}
                className={cn(
                  "min-h-[4.6rem] bg-card p-1.5 text-left align-top transition hover:bg-secondary/40 sm:p-2",
                  selected === key &&
                    "bg-primary/5 ring-1 ring-inset ring-primary/40",
                )}
              >
                <span className="text-[11px] font-semibold">{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <span
                      key={booking.id}
                      className="flex items-center gap-1 truncate rounded bg-muted/70 px-1 py-0.5 text-[9px] leading-4"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          statusColour[booking.status] ?? "bg-muted-foreground",
                        )}
                      />
                      <span className="truncate">{booking.eventType}</span>
                    </span>
                  ))}
                  {dayBookings.length > 2 ? (
                    <span className="block text-[9px] font-semibold text-primary">
                      +{dayBookings.length - 2} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {Object.entries(statusColour).map(([status, colour]) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", colour)} />
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {selected
            ? new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
                new Date(`${selected}T12:00:00`),
              )
            : "Select a date"}
        </h3>
        {selectedBookings.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Click any date with an event chip to see the enquiry details. Use
            the list below the calendar to manage every booking.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {selectedBookings.map((booking) => (
              <li key={booking.id} className="rounded-xl bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold">{booking.name}</p>
                  <Badge
                    variant={
                      booking.status === "CONFIRMED"
                        ? "green"
                        : booking.status === "CANCELLED"
                          ? "red"
                          : booking.status === "COMPLETED"
                            ? "blue"
                            : "gold"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {booking.eventType}
                </p>
                <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {new Intl.DateTimeFormat("en-GB", {
                      timeZone: "Asia/Kathmandu",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(booking.eventDate))}
                  </p>
                  <p className="flex items-center gap-1">
                    <UsersRound className="size-3" /> {booking.guests} guests
                  </p>
                  {booking.venueName ? (
                    <p className="flex items-center gap-1">
                      <MapPin className="size-3" /> {booking.venueName}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
