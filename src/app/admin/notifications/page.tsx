import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Mail,
  ReceiptText,
  Star,
  TestTube2,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { MarkAllReadButton } from "@/components/admin/mark-all-read-button";
import { NotificationActions } from "@/components/admin/notification-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/security";
import {
  getNotificationInbox,
  getNotificationInboxCount,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { testDataControlsVisible } from "@/lib/test-data";
import { formatDateTime, formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const TYPE_FILTERS = [
  { value: "ALL", label: "All types" },
  { value: "ORDER", label: "Orders" },
  { value: "PAYMENT", label: "Payments" },
  { value: "REVIEW", label: "Reviews" },
  { value: "MESSAGE", label: "Messages" },
  { value: "RESERVATION", label: "Reservations" },
  { value: "EVENT", label: "Events" },
  { value: "SYSTEM", label: "System" },
] as const;

const TYPE_ICONS = {
  ORDER: ReceiptText,
  PAYMENT: CreditCard,
  REVIEW: Star,
  MESSAGE: Mail,
  RESERVATION: CalendarCheck2,
  EVENT: CalendarDays,
  SYSTEM: Bell,
} as const;

function safeAdminLink(link: string | null) {
  return link && /^\/admin(?:\/|$)/.test(link) && !link.includes("\\")
    ? link
    : null;
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    type?: string;
    page?: string;
    test?: string;
  }>;
}) {
  const user = await requireStaff("/admin/notifications");
  const params = await searchParams;
  const unreadOnly = params.filter === "unread";
  const type = TYPE_FILTERS.some((item) => item.value === params.type)
    ? (params.type as string)
    : "ALL";
  const testControlsVisible = testDataControlsVisible();
  const includeTest = testControlsVisible && params.test === "1";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const filters = {
    unreadOnly,
    type: type === "ALL" ? undefined : type,
    includeTest,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  };
  let notifications: Awaited<ReturnType<typeof getNotificationInbox>> = [];
  let total = 0;
  let unreadCount = 0;

  try {
    const [nList, tot, uCount] = await Promise.all([
    getNotificationInbox(user.id, filters),
    getNotificationInboxCount(user.id, filters),
    getUnreadNotificationCount(user.id),
    ]);
    notifications = nList;
    total = tot;
    unreadCount = uCount;
  } catch {
    console.warn("Database offline in AdminNotificationsPage; using empty inbox.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: {
    filter?: string;
    type?: string;
    page?: number;
    test?: boolean;
  }) {
    const query = new URLSearchParams();
    const nextFilter = next.filter ?? (unreadOnly ? "unread" : "all");
    const nextType = next.type ?? type;
    const nextTest = next.test ?? includeTest;
    if (nextFilter === "unread") query.set("filter", "unread");
    if (nextType !== "ALL") query.set("type", nextType);
    if (nextTest) query.set("test", "1");
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString()
      ? `/admin/notifications?${query}`
      : "/admin/notifications";
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Staff inbox"
        title="Notifications"
        description="Full notification history. The dashboard only previews the latest five. New-order alerts are also delivered in real time when connected."
        actions={
          <>
            <Badge variant="gold">{unreadCount} unread</Badge>
            {unreadCount > 0 ? <MarkAllReadButton /> : null}
          </>
        }
      />

      <AdminCard className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={href({ filter: "all", page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                unreadOnly
                  ? "border-border bg-background hover:border-primary/40"
                  : "border-primary bg-primary text-primary-foreground"
              }`}
            >
              All
            </Link>
            <Link
              href={href({ filter: "unread", page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                unreadOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              Unread
            </Link>
            {TYPE_FILTERS.slice(1).map((item) => (
              <Link
                key={item.value}
                href={href({ type: item.value, page: 1 })}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  type === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {testControlsVisible ? (
            <Link
              href={href({ test: !includeTest, page: 1 })}
              className="flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <TestTube2 className="size-3.5" />
              {includeTest ? "Hide test alerts" : "Show test alerts"}
            </Link>
          ) : null}
        </div>
        {includeTest ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            Test alerts are visible for development only. They are excluded from
            the unread badge and real notification metrics.
          </p>
        ) : null}
      </AdminCard>

      {notifications.length === 0 ? (
        <AdminEmpty
          title={
            unreadOnly ? "No unread notifications" : "No notifications yet"
          }
          description={
            unreadOnly
              ? "You are caught up. Switch to All to review the full history."
              : "New orders, verified payments and other staff events will appear here."
          }
        >
          <Button asChild variant="outline" size="sm">
            <Link href={href({ filter: "all", page: 1 })}>
              View all notifications
            </Link>
          </Button>
        </AdminEmpty>
      ) : (
        <AdminCard className="overflow-hidden">
          <ul className="divide-y divide-border/60">
            {notifications.map((notification) => {
              const Icon =
                TYPE_ICONS[notification.type as keyof typeof TYPE_ICONS] ??
                Bell;
              const orderHref = notification.order
                ? `/admin/orders/${notification.order.id}`
                : safeAdminLink(notification.link);
              const isRead = Boolean(notification.readAt);
              return (
                <li
                  key={notification.id}
                  className={
                    isRead
                      ? "px-4 py-4 sm:px-5"
                      : "bg-primary/[0.035] px-4 py-4 sm:px-5"
                  }
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!isRead ? (
                          <span
                            className="size-1.5 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : null}
                        <p
                          className={
                            isRead
                              ? "text-sm font-medium"
                              : "text-sm font-semibold"
                          }
                        >
                          {notification.title}
                        </p>
                        <Badge variant="muted" className="text-[10px]">
                          {notification.type}
                        </Badge>
                        {notification.isTest ? (
                          <Badge variant="amber" className="text-[10px]">
                            Test
                          </Badge>
                        ) : null}
                        {notification.order ? (
                          <Badge variant="outline" className="text-[10px]">
                            {notification.order.orderNumber}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        {formatRelative(notification.createdAt)} ·{" "}
                        {formatDateTime(notification.createdAt)}
                        {notification.readAt
                          ? ` · read ${formatRelative(notification.readAt)}`
                          : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {orderHref ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                          >
                            <Link href={orderHref}>
                              {notification.order ? "Open order" : "Open"}
                            </Link>
                          </Button>
                        ) : null}
                        <NotificationActions
                          notificationId={notification.id}
                          isRead={isRead}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Full inbox · {total} notification{total === 1 ? "" : "s"}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </p>
        {totalPages > 1 ? (
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={href({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon"
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            >
              <Link href={href({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
