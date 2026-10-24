import nextDynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Clock3,
  IndianRupee,
  Mail,
  MessageSquareText,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { MarkAllReadButton } from "@/components/admin/mark-all-read-button";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/orders/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.RevenueChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);

const TopDishChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.TopDishChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";
import { formatNPR } from "@/lib/money";
import { getNotificationInbox } from "@/lib/notifications";
import { paymentPresentation } from "@/lib/order-state";
import { realOrdersWhere } from "@/lib/test-data";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import {
  BOOKING_STATUSES,
  STATUS_META,
  type OrderStatus,
} from "@/lib/constants";
import { todayInNepal } from "@/lib/time";

export const dynamic = "force-dynamic";

function nepalDayStart(day: string) {
  return new Date(`${day}T00:00:00+05:45`);
}

function dayKeyInNepal(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const user = await requireStaff("/admin");
  const now = new Date();
  const today = todayInNepal();
  const todayStart = nepalDayStart(today);
  const yesterday = new Date(todayStart);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const monthStart = new Date(todayStart);
  monthStart.setUTCDate(monthStart.getUTCDate() - 29);

  let todayOrders = { _count: { _all: 0 }, _sum: { total: null as number | null } };
  let todayRevenue = { _sum: { total: null as number | null } };
  let yesterdayRevenue = { _sum: { total: null as number | null } };
  let activeOrders = 0;
  let pendingReservations = 0;
  let pendingEvents = 0;
  let unreadMessages = 0;
  let customerCount = 0;
  let newCustomers = 0;
  type DashboardRecentOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    type: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    createdAt: Date;
    isTest: boolean;
  };

  type DashboardReservation = {
    id: string;
    name: string;
    date: Date;
    guests: number;
    status: string;
    occasion: string | null;
  };

  type DashboardEventBooking = {
    id: string;
    name: string;
    eventDate: Date;
    guests: number;
    status: string;
    eventType: string;
    venue: { name: string } | null;
  };

  let recentOrders: DashboardRecentOrder[] = [];
  let weekOrders: { createdAt: Date; total: number; paymentStatus: string }[] = [];
  let statusCounts: { status: string; _count: { _all: number } }[] = [];
  let upcomingReservations: DashboardReservation[] = [];
  let upcomingEvents: DashboardEventBooking[] = [];
  let topDishes: { name: string; _sum: { quantity: number | null } }[] = [];
  let notifications: Awaited<ReturnType<typeof getNotificationInbox>> = [];

  try {
    const results = await Promise.all([
    prisma.order.aggregate({
      where: realOrdersWhere({
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
      }),
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: realOrdersWhere({
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
        paymentStatus: "PAID",
      }),
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: realOrdersWhere({
        createdAt: { gte: yesterday, lt: todayStart },
        status: { not: "CANCELLED" },
        paymentStatus: "PAID",
      }),
      _sum: { total: true },
    }),
    prisma.order.count({
      where: realOrdersWhere({
        status: {
          in: [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "READY",
            "OUT_FOR_DELIVERY",
          ],
        },
      }),
    }),
    prisma.reservation.count({
      where: { status: "PENDING", date: { gte: now } },
    }),
    prisma.eventBooking.count({
      where: { status: "PENDING", eventDate: { gte: now } },
    }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.user.count({ where: { role: "CUSTOMER", isTest: false } }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        isTest: false,
        createdAt: { gte: monthStart },
      },
    }),
    prisma.order.findMany({
      where: realOrdersWhere(),
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        type: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        isTest: true,
      },
    }),
    prisma.order.findMany({
      where: realOrdersWhere({
        createdAt: { gte: weekStart },
        status: { not: "CANCELLED" },
      }),
      select: { createdAt: true, total: true, paymentStatus: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: realOrdersWhere({
        status: {
          in: [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "READY",
            "OUT_FOR_DELIVERY",
          ],
        },
      }),
    }),
    prisma.reservation.findMany({
      where: { date: { gte: now }, status: { in: [...BOOKING_STATUSES] } },
      orderBy: { date: "asc" },
      take: 4,
      select: {
        id: true,
        name: true,
        date: true,
        guests: true,
        status: true,
        occasion: true,
      },
    }),
    prisma.eventBooking.findMany({
      where: { eventDate: { gte: now } },
      orderBy: { eventDate: "asc" },
      take: 3,
      select: {
        id: true,
        name: true,
        eventDate: true,
        guests: true,
        status: true,
        eventType: true,
        venue: { select: { name: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      _sum: { quantity: true },
      where: {
        order: realOrdersWhere({
          createdAt: { gte: monthStart },
          status: { not: "CANCELLED" },
        }),
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    getNotificationInbox(user.id, { take: 5, unreadOnly: true }),
    ]);

    todayOrders = results[0];
    todayRevenue = results[1];
    yesterdayRevenue = results[2];
    activeOrders = results[3];
    pendingReservations = results[4];
    pendingEvents = results[5];
    unreadMessages = results[6];
    customerCount = results[7];
    newCustomers = results[8];
    recentOrders = results[9];
    weekOrders = results[10];
    statusCounts = results[11];
    upcomingReservations = results[12];
    upcomingEvents = results[13];
    topDishes = results[14];
    notifications = results[15];
  } catch {
    console.warn("Database offline on admin dashboard; showing empty metrics.");
  }

  const chartMap = new Map<
    string,
    { label: string; revenue: number; orders: number }
  >();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(todayStart);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = dayKeyInNepal(date);
    chartMap.set(key, {
      label: new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kathmandu",
        weekday: "short",
        day: "numeric",
      }).format(date),
      revenue: 0,
      orders: 0,
    });
  }
  for (const order of weekOrders) {
    const key = dayKeyInNepal(order.createdAt);
    const entry = chartMap.get(key);
    if (!entry) continue;
    entry.orders += 1;
    if (order.paymentStatus === "PAID") entry.revenue += order.total;
  }
  const chartData = [...chartMap.values()];

  const revenueToday = todayRevenue._sum.total ?? 0;
  const revenueYesterday = yesterdayRevenue._sum.total ?? 0;
  const revenueChange =
    revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : null;

  const topDishData = topDishes.map((dish) => ({
    name: dish.name.length > 18 ? `${dish.name.slice(0, 17)}…` : dish.name,
    quantity: dish._sum.quantity ?? 0,
  }));

  const statusTotal = statusCounts.reduce(
    (sum, row) => sum + row._count._all,
    0,
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Today at Purple Haze"
        title={`Good ${now.getUTCHours() + 5 < 12 ? "morning" : now.getUTCHours() + 5 < 17 ? "afternoon" : "evening"}, ${user.name?.split(" ")[0] ?? "team"}`}
        description={`${formatDate(now)} · All times shown in Nepal time. Keep an eye on live orders and today's bookings.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/reports">
                <TrendingUp className="size-4" /> Reports
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/orders">
                <ClipboardList className="size-4" /> Live orders
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Revenue today"
          value={formatNPR(revenueToday)}
          icon={IndianRupee}
          tone="green"
          hint="Verified paid orders only"
          trend={
            revenueChange !== null
              ? {
                  value: `${Math.abs(revenueChange)}% vs yesterday`,
                  direction: revenueChange >= 0 ? "up" : "down",
                }
              : undefined
          }
        />
        <StatCard
          label="Orders today"
          value={String(todayOrders._count._all)}
          hint={`${formatNPR(todayOrders._sum.total ?? 0)} order value`}
          icon={ShoppingBag}
          tone="violet"
        />
        <StatCard
          label="Active orders"
          value={String(activeOrders)}
          hint="Pending through out for delivery"
          icon={ChefHat}
          tone="gold"
        />
        <StatCard
          label="New messages"
          value={String(unreadMessages)}
          hint="Contact form enquiries"
          icon={Mail}
          tone="rose"
        />
        <StatCard
          label="Customers"
          value={String(customerCount)}
          hint={`${newCustomers} new in 30 days`}
          icon={Users}
          tone="blue"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AdminCard className="p-5 xl:col-span-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Last seven days
              </h2>
              <p className="text-xs text-muted-foreground">
                Paid revenue, with order counts for context.
              </p>
            </div>
            <Badge variant="green" className="w-fit">
              {formatNPR(chartData.reduce((sum, day) => sum + day.revenue, 0))}{" "}
              paid
            </Badge>
          </div>
          <div className="mt-5">
            <RevenueChart data={chartData} />
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Kitchen favourites
              </h2>
              <p className="text-xs text-muted-foreground">
                Top dishes, last 30 days.
              </p>
            </div>
            <ChefHat className="size-5 text-primary" />
          </div>
          {topDishData.length > 0 ? (
            <div className="mt-4">
              <TopDishChart data={topDishData} />
            </div>
          ) : (
            <div className="mt-4 grid h-[250px] place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Dish sales will appear after the first orders.
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Recent orders
              </h2>
              <p className="text-xs text-muted-foreground">Newest first.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-5">
              <AdminEmpty
                title="No orders yet"
                description="Orders placed on the website will appear here in real time."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentOrders.map((order) => {
                const payment = paymentPresentation(
                  order.paymentMethod,
                  order.paymentStatus,
                );
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-muted/40"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <ReceiptText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {order.orderNumber}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {order.customerName}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatRelative(order.createdAt)} · {order.type}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatNPR(order.total)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {payment.label}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </AdminCard>

        <div className="space-y-4">
          <AdminCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <CalendarCheck2 className="size-5 text-primary" /> Next bookings
              </h2>
              <Badge variant="gold">{pendingReservations}</Badge>
            </div>
            {upcomingReservations.length === 0 &&
            upcomingEvents.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                No upcoming table requests or events.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcomingReservations.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="rounded-xl bg-muted/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">
                        {reservation.name}
                      </p>
                      <Badge
                        variant={
                          reservation.status === "CONFIRMED" ? "green" : "gold"
                        }
                      >
                        {reservation.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDateTime(reservation.date)} · {reservation.guests}{" "}
                      guests
                      {reservation.occasion ? ` · ${reservation.occasion}` : ""}
                    </p>
                  </li>
                ))}
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{event.name}</p>
                      <Badge variant="violet">{event.eventType}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDateTime(event.eventDate)} · {event.guests} guests
                      {event.venue ? ` · ${event.venue.name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/reservations">
                  <CalendarDays className="size-3.5" /> Reservations
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/event-bookings">Events</Link>
              </Button>
            </div>
          </AdminCard>

          <AdminCard className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Bell className="size-5 text-primary" /> Notifications
              </h2>
              {notifications.length > 0 ? <MarkAllReadButton /> : null}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Recent 5 unread
              </p>
              <Link
                href="/admin/notifications"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Full inbox
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquareText className="size-4" /> You are all caught up.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {notifications.map((notification) => {
                  const href = notification.order
                    ? `/admin/orders/${notification.order.id}`
                    : notification.link?.startsWith("/admin")
                      ? notification.link
                      : null;
                  const content = (
                    <>
                      <p className="font-medium leading-5">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 leading-5 text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatRelative(notification.createdAt)}
                      </p>
                    </>
                  );
                  return (
                    <li key={notification.id} className="flex gap-2.5 text-xs">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold" />
                      {href ? (
                        <Link
                          href={href}
                          className="min-w-0 hover:text-primary"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="min-w-0">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                In the kitchen now
              </h2>
              <p className="text-xs text-muted-foreground">
                Active orders by stage.
              </p>
            </div>
            <Clock3 className="size-5 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {statusCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active orders.</p>
            ) : (
              statusCounts.map((row) => {
                const meta = STATUS_META[row.status as OrderStatus];
                const count = row._count._all;
                const width =
                  statusTotal > 0
                    ? Math.max(8, (count / statusTotal) * 100)
                    : 0;
                return (
                  <div key={row.status}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {meta?.label ?? row.status}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Button asChild variant="soft" size="sm" className="mt-4 w-full">
            <Link href="/admin/orders">Open live orders board</Link>
          </Button>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Events pipeline
              </h2>
              <p className="text-xs text-muted-foreground">
                {pendingEvents} event{pendingEvents === 1 ? "" : "s"} awaiting a
                reply.
              </p>
            </div>
            <CalendarDays className="size-5 text-primary" />
          </div>
          <div className="mt-4 rounded-xl bg-ink p-4 text-white">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              This month
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-gold">
              {upcomingEvents.reduce((sum, event) => sum + event.guests, 0)}
            </p>
            <p className="text-xs text-white/60">
              event guests in the pipeline
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href="/admin/event-bookings">
              Manage event enquiries <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </AdminCard>
      </div>
    </>
  );
}
