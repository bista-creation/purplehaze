import "server-only";
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

/**
 * Notifications are durable events. The unique eventKey makes retries safe:
 * a repeated callback or status submission cannot create a second event.
 */
export async function createStaffNotification(
  tx: Prisma.TransactionClient,
  input: StaffNotificationInput,
) {
  return tx.notification.upsert({
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
