import "server-only";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StaffNotificationInput = {
  eventKey: string;
  type?: string;
  title: string;
  message: string;
  link?: string | null;
  orderId?: string | null;
  isTest?: boolean;
};

async function broadcastToStaffPushTokens(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const tokens = await prisma.pushToken.findMany({
      // Staff alerts must never fan out to customer/guest devices. The staff
      // app registers its token only after bearer authentication links it to
      // a STAFF or ADMIN user.
      where: { user: { is: { role: { in: ["STAFF", "ADMIN"] } } } },
      select: { token: true },
      take: 100,
    });
    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "order_alert.wav",
      title,
      body,
      data: {
        ...(data || {}),
        urgent: true,
        isAlarm: true,
      },
      channelId: "incoming-orders",
      priority: "high",
      _displayInForeground: true,
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.warn(`[Expo Push] Staff broadcast failed with HTTP ${response.status}`);
    }
  } catch (error) {
    // Background dispatch is non-blocking
    console.warn("[Expo Push] Staff broadcast failed:", error);
  }
}

/**
 * Notifications are durable events. The unique eventKey makes retries safe:
 * a repeated callback or status submission cannot create a second event.
 */
export async function createStaffNotification(
  tx: Prisma.TransactionClient,
  input: StaffNotificationInput,
) {
  const notification = await tx.notification.upsert({
    where: { eventKey: input.eventKey },
    update: {},
    create: {
      eventKey: input.eventKey,
      type: input.type ?? "SYSTEM",
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      orderId: input.orderId ?? null,
      isTest: input.isTest ?? false,
    },
  });

  // Safe background dispatch: try after() if inside Next.js request scope;
  // fall back gracefully to a floating promise so an out-of-scope error never aborts transactions.
  try {
    after(() => broadcastToStaffPushTokens(input.title, input.message, {
      orderId: input.orderId,
      type: input.type,
    }));
  } catch {
    void broadcastToStaffPushTokens(input.title, input.message, {
      orderId: input.orderId,
      type: input.type,
    });
  }

  return notification;
}

export type NotificationInboxItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isTest: boolean;
  createdAt: Date;
  readAt: Date | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    type: string;
    paymentStatus: string;
  } | null;
};

export type NotificationInboxFilters = {
  unreadOnly?: boolean;
  type?: string;
  orderStatus?: string;
  includeTest?: boolean;
  take?: number;
  skip?: number;
};

function inboxWhere(
  userId: string,
  filters: NotificationInboxFilters,
): Prisma.NotificationWhereInput {
  const and: Prisma.NotificationWhereInput[] = [
    { OR: [{ userId: null }, { userId }] },
  ];
  if (!filters.includeTest) and.push({ isTest: false });
  if (filters.unreadOnly) {
    and.push({ reads: { none: { userId } } });
  }
  if (filters.type) and.push({ type: filters.type });
  if (filters.orderStatus) {
    and.push({ order: { is: { status: filters.orderStatus } } });
  }
  return { AND: and };
}

export async function getNotificationInbox(
  userId: string,
  filters: NotificationInboxFilters = {},
): Promise<NotificationInboxItem[]> {
  const rows = await prisma.notification.findMany({
    where: inboxWhere(userId, filters),
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filters.take ?? 50, 1), 200),
    skip: Math.max(filters.skip ?? 0, 0),
    include: {
      reads: { where: { userId }, select: { readAt: true }, take: 1 },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          type: true,
          paymentStatus: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isTest: row.isTest,
    createdAt: row.createdAt,
    readAt: row.reads[0]?.readAt ?? null,
    order: row.order,
  }));
}

export async function getNotificationInboxCount(
  userId: string,
  filters: NotificationInboxFilters = {},
) {
  return prisma.notification.count({
    where: inboxWhere(userId, filters),
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      isTest: false,
      OR: [{ userId: null }, { userId }],
      reads: { none: { userId } },
    },
  });
}
