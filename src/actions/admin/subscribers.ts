"use server";

import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
  staffActionUser,
} from "@/lib/admin";
import type { AdminActionResult } from "@/actions/admin/orders";

export async function toggleSubscriberStatusAction(
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return { success: false, message: "Subscriber not found." };
    }

    await prisma.newsletterSubscriber.update({
      where: { id },
      data: { isActive },
    });

    await auditAction(
      user,
      "newsletter.subscriber.status",
      "NewsletterSubscriber",
      id,
      { email: subscriber.email, from: subscriber.isActive, to: isActive },
    );

    refreshAdmin("/admin/subscribers");
    return {
      success: true,
      message: isActive ? "Subscriber marked active." : "Subscriber marked inactive.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Failed to update subscriber status."),
    };
  }
}

export async function deleteSubscriberAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return { success: false, message: "Subscriber not found." };
    }

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    await auditAction(
      user,
      "newsletter.subscriber.delete",
      "NewsletterSubscriber",
      id,
      { email: subscriber.email },
    );

    refreshAdmin("/admin/subscribers");
    return {
      success: true,
      message: "Subscriber removed successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Failed to delete subscriber."),
    };
  }
}
