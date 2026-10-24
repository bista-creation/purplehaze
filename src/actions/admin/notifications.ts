"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionErrorMessage, staffActionUser } from "@/lib/admin";
import type { AdminActionResult } from "@/actions/admin/orders";

function revalidateNotifications() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/notifications");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });
    if (
      !notification ||
      (notification.userId !== null && notification.userId !== user.id)
    ) {
      return { success: false, message: "Notification not found." };
    }

    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId: user.id,
        },
      },
      update: {},
      create: { notificationId, userId: user.id },
    });
    revalidateNotifications();
    return { success: true, message: "Notification marked read." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "We couldn't update that notification.",
      ),
    };
  }
}

export async function markNotificationUnreadAction(
  notificationId: string,
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    await prisma.notificationRead.deleteMany({
      where: { notificationId, userId: user.id },
    });
    revalidateNotifications();
    return { success: true, message: "Notification marked unread." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(
        error,
        "We couldn't update that notification.",
      ),
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const unread = await prisma.notification.findMany({
      where: {
        isTest: false,
        OR: [{ userId: null }, { userId: user.id }],
        reads: { none: { userId: user.id } },
      },
      select: { id: true },
    });

    if (unread.length > 0) {
      await prisma.notificationRead.createMany({
        data: unread.map((notification) => ({
          notificationId: notification.id,
          userId: user.id,
        })),
      });
    }

    revalidateNotifications();
    return {
      success: true,
      message: `${unread.length} notification${unread.length === 1 ? "" : "s"} marked read.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update notifications."),
    };
  }
}
