import "server-only";
import { prisma } from "@/lib/prisma";

const EXPO_PUSH_ENDPOINT = "https://expopush.net/v2/push/send";

export type PushMessage = {
  to: string;
  sound?: "default" | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: "default" | "normal" | "high";
};

export class PushNotificationService {
  /**
   * Verifies if a string matches the standard Expo push token pattern.
   */
  isExpoPushToken(token: string): boolean {
    return (
      typeof token === "string" &&
      (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")) &&
      token.endsWith("]")
    );
  }

  /**
   * Sends raw batch of push messages to Expo push servers.
   */
  async sendMessages(messages: PushMessage[]): Promise<{
    sent: number;
    failed: number;
    unregisteredTokens: string[];
  }> {
    if (!messages.length) {
      return { sent: 0, failed: 0, unregisteredTokens: [] };
    }

    const unregisteredTokens: string[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Expo recommends chunks of up to 100
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);

      try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });

        if (!res.ok) {
          console.warn("[Expo Push] HTTP error from push server:", res.status, res.statusText);
          failedCount += chunk.length;
          continue;
        }

        const json = await res.json();
        const tickets: Array<{
          status: "ok" | "error";
          message?: string;
          details?: { error?: string };
        }> = json.data || [];

        tickets.forEach((ticket, idx) => {
          if (ticket.status === "ok") {
            sentCount += 1;
          } else {
            failedCount += 1;
            if (ticket.details?.error === "DeviceNotRegistered") {
              const badToken = chunk[idx]?.to;
              if (badToken) {
                unregisteredTokens.push(badToken);
              }
            }
          }
        });
      } catch (error) {
        console.warn("[Expo Push] Network error while sending push chunk:", error);
        failedCount += chunk.length;
      }
    }

    // Clean up invalid or uninstalled device tokens from database
    if (unregisteredTokens.length > 0) {
      await prisma.pushToken
        .deleteMany({
          where: { token: { in: unregisteredTokens } },
        })
        .catch((err) => console.warn("[Expo Push] Error pruning unregistered tokens:", err));
    }

    return { sent: sentCount, failed: failedCount, unregisteredTokens };
  }

  /**
   * Queries Expo Push Receipt API and deletes any tokens that report DeviceNotRegistered.
   */
  async checkReceipts(
    receiptIds: string[],
    receiptToTokenMap?: Record<string, string>,
  ): Promise<string[]> {
    if (!receiptIds.length) return [];
    try {
      const res = await fetch("https://expopush.net/v2/push/getReceipts", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: receiptIds }),
      });

      if (!res.ok) return [];
      const json = await res.json();
      const receipts: Record<string, { status: string; message?: string; details?: { error?: string } }> =
        json.data || {};

      const deadTokens: string[] = [];
      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
          const badToken = receiptToTokenMap?.[receiptId];
          if (badToken) {
            deadTokens.push(badToken);
          }
        }
      }

      if (deadTokens.length > 0) {
        await prisma.pushToken
          .deleteMany({
            where: { token: { in: deadTokens } },
          })
          .catch((err) =>
            console.warn("[Expo Push] Error pruning unregistered tokens from receipts:", err),
          );
      }

      return deadTokens;
    } catch (error) {
      console.warn("[Expo Push] Error checking push receipts:", error);
      return [];
    }
  }

  /**
   * Sends a push notification to all active devices registered by a user.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    if (!userId) return { sent: 0, failed: 0 };

    const records = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!records.length) {
      return { sent: 0, failed: 0 };
    }

    const validTokens = records
      .map((r) => r.token)
      .filter((t) => this.isExpoPushToken(t));

    if (!validTokens.length) {
      return { sent: 0, failed: 0 };
    }

    const messages: PushMessage[] = validTokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    }));

    return this.sendMessages(messages);
  }

  /**
   * Sends tailored push notifications for order status transitions.
   */
  async sendOrderStatusNotification(params: {
    userId?: string | null;
    orderId: string;
    orderNumber: string;
    status: string;
    note?: string | null;
  }) {
    if (!params.userId) return;

    let title = `Order #${params.orderNumber}`;
    let body = "";

    switch (params.status) {
      case "CONFIRMED":
        title = `Order #${params.orderNumber} Confirmed!`;
        body = "Our kitchen has received your order and is preparing to cook.";
        break;
      case "PREPARING":
        title = `Order #${params.orderNumber} is Cooking`;
        body = "Our chefs at Biratnagar are freshly preparing your dishes.";
        break;
      case "READY":
        title = `Order #${params.orderNumber} is Ready!`;
        body = "Your meal is ready for pickup or handover to our delivery driver.";
        break;
      case "OUT_FOR_DELIVERY":
        title = `Rider on the way!`;
        body = `Order #${params.orderNumber} is out for delivery to your address.`;
        break;
      case "COMPLETED":
        title = `Order #${params.orderNumber} Delivered`;
        body = "Thank you for dining with Purple Haze! Enjoy your food.";
        break;
      case "CANCELLED":
        title = `Order #${params.orderNumber} Cancelled`;
        body = params.note ? `Reason: ${params.note}` : "Your order has been cancelled.";
        break;
      default:
        body = `Your order status has changed to ${params.status.toLowerCase()}.`;
    }

    return this.sendToUser(params.userId, title, body, {
      type: "ORDER_STATUS",
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      status: params.status,
    });
  }

  /**
   * Sends table reservation status updates.
   */
  async sendReservationNotification(params: {
    userId?: string | null;
    reservationId: string;
    status: string;
    date: Date;
    tableNumber?: string | null;
  }) {
    if (!params.userId) return;

    const formattedDate = params.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = "Table Reservation Update";
    let body = `Your table request for ${formattedDate} is ${params.status.toLowerCase()}.`;

    if (params.status === "CONFIRMED") {
      title = "Table Reserved at Purple Haze!";
      body = params.tableNumber
        ? `Table #${params.tableNumber} is reserved for you on ${formattedDate}.`
        : `Your table is confirmed for ${formattedDate}. See you soon!`;
    }

    return this.sendToUser(params.userId, title, body, {
      type: "RESERVATION_STATUS",
      reservationId: params.reservationId,
      status: params.status,
    });
  }
}

export const pushNotificationService = new PushNotificationService();
