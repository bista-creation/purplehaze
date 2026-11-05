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
  Timer,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { DashboardAnalyticsSection } from "@/components/admin/dashboard-analytics-section";
import { MarkAllReadButton } from "@/components/admin/mark-all-read-button";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/orders/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Operational workload metrics
  const pendingOrdersCount =
    statusCounts.find((s) => s.status === "PENDING")?._count._all ?? 0;
  const cookingOrdersCount =
    (statusCounts.find((s) => s.status === "CONFIRMED")?._count._all ?? 0) +
    (statusCounts.find((s) => s.status === "PREPARING")?._count._all ?? 0);
  const readyOrdersCount =
    statusCounts.find((s) => s.status === "READY")?._count._all ?? 0;
  const transitOrdersCount =
    statusCounts.find((s) => s.status === "OUT_FOR_DELIVERY")?._count._all ?? 0;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <AdminPageHeader
        eyebrow="Today at Purple Haze"
        title={`Good ${now.getUTCHours() + 5 < 12 ? "morning" : now.getUTCHours() + 5 < 17 ? "afternoon" : "evening"}, ${user.name?.split(" ")[0] ?? "team"}`}
        description={`${formatDate(now)} · Nepal Time. Real-time active order and dispatch control.`}
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

      {/* 1. URGENT ACCEPTANCE BANNER: Direct Kitchen Priority */}
      {pendingOrdersCount > 0 ? (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
              <Timer className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-amber-950 dark:text-amber-100 sm:text-base">
                {pendingOrdersCount} Order{pendingOrdersCount === 1 ? "" : "s"} Awaiting Acceptance
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Customers are waiting for kitchen confirmation. Review order details now.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="w-full shrink-0 bg-amber-600 text-white hover:bg-amber-700 sm:w-auto">
            <Link href="/admin/orders?view=needs_action">
              Review Queue <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* 2. OPERATIONAL QUICK ACCESS: Active Kitchen, Dispatch, Bookings */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Link
          href="/admin/orders"
          className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-primary/40 hover:bg-muted/30"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground dark:text-gold">
            <ChefHat className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Kitchen Orders</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {cookingOrdersCount + readyOrdersCount} cooking / ready
            </p>
          </div>
        </Link>

        <Link
          href="/admin/dispatch"
          className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-primary/40 hover:bg-muted/30"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Truck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Dispatch Board</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {transitOrdersCount} in transit
            </p>
          </div>
        </Link>

        <Link
          href="/admin/reservations"
          className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-primary/40 hover:bg-muted/30 sm:col-span-1"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-500">
            <CalendarCheck2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Table Bookings</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {pendingReservations} requests pending
            </p>
          </div>
        </Link>
      </div>

      {/* 3. CORE METRICS: Clean 2-column stacking on phone, 5-column on desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
        <StatCard
          label="Revenue today"
          value={formatNPR(revenueToday)}
          icon={IndianRupee}
          tone="green"
          hint="Verified paid orders"
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
          hint="Kitchen through dispatch"
          icon={ChefHat}
          tone="gold"
        />
        <StatCard
          label="New messages"
          value={String(unreadMessages)}
          hint="Contact enquiries"
          icon={Mail}
          tone="rose"
        />
        <div className="col-span-2 sm:col-span-1 xl:col-span-1">
          <StatCard
            label="Customers"
            value={String(customerCount)}
            hint={`${newCustomers} new in 30 days`}
            icon={Users}
            tone="blue"
          />
        </div>
      </div>

      {/* 4. ACTIVE OPERATIONS & LIVE TICKETS: Prioritized above secondary charts */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* Left Column (2 cols on xl): Active Kitchen Stages + Recent Orders */}
        <div className="space-y-4 xl:col-span-2">
          {/* Active Kitchen Stages */}
          <AdminCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold sm:text-xl">
                  In the kitchen now
                </h2>
                <p className="text-xs text-muted-foreground">
                  Active orders by service stage.
                </p>
              </div>
              <Clock3 className="size-5 text-primary shrink-0" />
            </div>
            <div className="mt-3.5 space-y-2">
              {statusCounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active orders right now.</p>
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

          {/* Recent Orders List */}
          <AdminCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="font-display text-lg font-semibold sm:text-xl">
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
                      className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 transition hover:bg-muted/40"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                        <ReceiptText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold sm:text-sm">
                          {order.orderNumber}
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            {order.customerName}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatRelative(order.createdAt)} · {order.type}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                      <div className="text-right">
                        <p className="text-xs font-semibold sm:text-sm">
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
        </div>

        {/* Right Column (1 col on xl): Next Bookings & Notifications */}
        <div className="space-y-4">
          {/* Next Bookings */}
          <AdminCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
                <CalendarCheck2 className="size-5 text-primary shrink-0" /> Next bookings
              </h2>
              <Badge variant="gold">{pendingReservations}</Badge>
            </div>
            {upcomingReservations.length === 0 &&
            upcomingEvents.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                No upcoming table requests or events.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {upcomingReservations.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="rounded-xl bg-muted/50 p-2.5 sm:p-3"
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
                  <li key={event.id} className="rounded-xl bg-primary/5 p-2.5 sm:p-3">
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
                  <CalendarDays className="size-3.5" /> Tables
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/event-bookings">Events</Link>
              </Button>
            </div>
          </AdminCard>

          {/* Unread Notifications */}
          <AdminCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
                <Bell className="size-5 text-primary shrink-0" /> Notifications
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
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
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

      {/* 5. SECONDARY DETAILS: Progressive disclosure on mobile (< lg), expanded on desktop (lg:) */}
      <DashboardAnalyticsSection
        chartData={chartData}
        topDishData={topDishData}
        pendingEvents={pendingEvents}
        upcomingEventGuests={upcomingEvents.reduce(
          (sum, event) => sum + event.guests,
          0,
        )}
      />
    </div>
  );
}
