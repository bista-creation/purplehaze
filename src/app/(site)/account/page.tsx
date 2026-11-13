import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Heart,
  MapPin,
  ReceiptText,
  Settings,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import { formatNPR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { getLoyaltySummary } from "@/lib/services/loyalty.service";
import { StatusBadge } from "@/components/orders/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Overview" };

export default async function AccountOverviewPage() {
  const user = await requireUser();
  const [
    orderCount,
    addressCount,
    favoriteCount,
    reservationCount,
    eventCount,
    recentOrders,
    nextReservation,
    nextEvent,
    loyalty,
  ] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.address.count({ where: { userId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.reservation.count({ where: { userId: user.id } }),
    prisma.eventBooking.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { items: { take: 3 } },
    }),
    prisma.reservation.findFirst({
      where: {
        userId: user.id,
        date: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { date: "asc" },
    }),
    prisma.eventBooking.findFirst({
      where: {
        userId: user.id,
        eventDate: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { eventDate: "asc" },
      include: { venue: true },
    }),
    getLoyaltySummary(user.id).catch(() => null),
  ]);

  const stats = [
    { href: "/account/orders", label: "Orders", value: orderCount, icon: ReceiptText },
    { href: "#loyalty-rewards", label: "Rewards pts", value: loyalty?.pointsBalance ?? 0, icon: Sparkles },
    { href: "/account/addresses", label: "Addresses", value: addressCount, icon: MapPin },
    { href: "/account/favorites", label: "Favourites", value: favoriteCount, icon: Heart },
    {
      href: "/account/bookings",
      label: "Bookings",
      value: reservationCount + eventCount,
      icon: CalendarCheck,
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Hello, {user.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything from your last order to your next table.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/account/settings">
            <Settings className="size-4" /> Account settings
          </Link>
        </Button>
      </div>

      {!user.emailVerified ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Please verify your email address to keep your account secure. Sign out
          and request a new verification link from the sign-in page.
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
                <stat.icon className="size-4" />
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Recent orders</h2>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/account/orders">
                All orders <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
              <Sparkles className="mx-auto size-6 text-gold" />
              <p className="mt-3 text-sm font-semibold">No orders yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your first Purple Haze meal is waiting.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/menu">Browse the menu</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/order/${order.orderNumber}`}
                    className="flex items-start justify-between gap-4 py-4 transition hover:bg-secondary/20"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{order.orderNumber}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {order.items.map((item) => item.name).join(", ")}
                        {order.items.length === 3 ? "…" : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatNPR(order.total)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          {/* Loyalty Rewards Card */}
          <div id="loyalty-rewards" className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-display text-xl font-semibold">
                <Sparkles className="size-5 text-gold" />
                Loyalty Rewards
              </span>
              <Badge variant="outline" className="border-gold/40 text-gold font-semibold">
                {loyalty?.pointsBalance ?? 0} pts
              </Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Reward Tier (200 pts = 10% off)</span>
                <span className="font-medium">
                  {Math.min(200, loyalty?.pointsBalance ?? 0)} / 200
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((loyalty?.pointsBalance ?? 0) / 200) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {(loyalty?.pointsBalance ?? 0) >= 200
                  ? "🎉 You have unlocked a 10% discount on your next order! Apply it during checkout."
                  : `${loyalty?.pointsToNextReward ?? 200} more points needed to unlock 10% off your meal.`}
              </p>
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground">How it works:</p>
                <p className="mt-0.5">Earn 1 point for every NPR 100 spent on completed orders. Redeem 200 points for a flat 10% discount on your entire order.</p>
              </div>
            </div>
            {(loyalty?.pointsBalance ?? 0) >= 200 ? (
              <Button asChild size="sm" className="mt-4 w-full bg-gold text-primary-foreground hover:bg-gold/90">
                <Link href="/menu">Order & Redeem Reward</Link>
              </Button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Next table</h2>
            {nextReservation ? (
              <div className="mt-3">
                <Badge variant="outline">{nextReservation.status}</Badge>
                <p className="mt-2 text-sm font-semibold">
                  {formatDateTime(nextReservation.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextReservation.guests} guests
                  {nextReservation.occasion
                    ? ` · ${nextReservation.occasion}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                No upcoming table request. Reserve one for a slow lunch or a
                garden dinner.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/reservations">Reserve a table</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Next event</h2>
            {nextEvent ? (
              <div className="mt-3">
                <Badge variant="outline">{nextEvent.status}</Badge>
                <p className="mt-2 text-sm font-semibold">
                  {nextEvent.eventType}
                  {nextEvent.venue ? ` · ${nextEvent.venue.name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(nextEvent.eventDate)} · {nextEvent.guests} guests
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Planning a celebration? Tell our events team what you have in
                mind.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/events">Plan an event</Link>
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-8" />
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>
          Order history is private to your account. For help with an old order,
          contact the restaurant with the order number.
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
