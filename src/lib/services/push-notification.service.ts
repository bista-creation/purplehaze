import "server-only";
import { Expo, type ExpoPushMessage, type ExpoPushTicket, type ExpoPushReceipt } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";

export const EXPO_PUSH_SEND_ENDPOINT = "https://exp.host/--/api/v2/push/send";
export const EXPO_PUSH_RECEIPTS_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts";

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
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  /**
   * Verifies if a string matches the standard Expo push token pattern.
   */
  isExpoPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /**
   * Sends raw batch of push messages using the official Expo Server SDK.
   * Endpoints: https://exp.host/--/api/v2/push/send
   */
  async sendMessages(messages: PushMessage[]): Promise<{
    sent: number;
    failed: number;
    unregisteredTokens: string[];
    tickets: ExpoPushTicket[];
  }> {
    if (!messages.length) {
      return { sent: 0, failed: 0, unregisteredTokens: [], tickets: [] };
    }

    const unregisteredTokens: string[] = [];
    const allTickets: ExpoPushTicket[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Filter valid tokens
    const validMessages: ExpoPushMessage[] = [];
    for (const msg of messages) {
      if (this.isExpoPushToken(msg.to)) {
        validMessages.push(msg as ExpoPushMessage);
      } else {
        console.warn(`[Expo Push] Invalid push token skipped: ${msg.to}`);
        failedCount += 1;
      }
    }

    if (!validMessages.length) {
      return { sent: 0, failed: failedCount, unregisteredTokens: [], tickets: [] };
    }

    const chunks = this.expo.chunkPushNotifications(validMessages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...ticketChunk);

        ticketChunk.forEach((ticket, idx) => {
          if (ticket.status === "ok") {
            sentCount += 1;
          } else {
            failedCount += 1;
            console.warn(
              `[Expo Push] Provider rejected notification: ${ticket.message} (${ticket.details?.error ?? "unknown error"})`,
            );
            if (ticket.details?.error === "DeviceNotRegistered") {
              const badToken = chunk[idx]?.to;
              if (typeof badToken === "string") {
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

    return { sent: sentCount, failed: failedCount, unregisteredTokens, tickets: allTickets };
  }

  /**
   * Queries official Expo Push Receipt API and deletes any tokens that report DeviceNotRegistered.
   * Endpoint: https://exp.host/--/api/v2/push/getReceipts
   */
  async checkReceipts(
    receiptIds: string[],
    receiptToTokenMap?: Record<string, string>,
  ): Promise<string[]> {
    if (!receiptIds.length) return [];
    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      const deadTokens: string[] = [];

      for (const chunk of receiptIdChunks) {
        const receipts: Record<string, ExpoPushReceipt> =
          await this.expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
            const badToken = receiptToTokenMap?.[receiptId];
            if (badToken) {
              deadTokens.push(badToken);
            }
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
    channelId?: string,
  ) {
    if (!userId) return { sent: 0, failed: 0, unregisteredTokens: [], tickets: [] };

    const records = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!records.length) {
      return { sent: 0, failed: 0, unregisteredTokens: [], tickets: [] };
    }

    const validTokens = records
      .map((r) => r.token)
      .filter((t) => this.isExpoPushToken(t));

    if (!validTokens.length) {
      return { sent: 0, failed: 0, unregisteredTokens: [], tickets: [] };
    }

    const messages: PushMessage[] = validTokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data,
      channelId,
      priority: "high",
    }));

    return this.sendMessages(messages);
  }

  /**
   * Sends tailored push notifications for order status transitions.
   * Cancellation notices strictly use a customer-safe message, never exposing internal notes.
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
        // Strictly customer-safe message — never expose internal kitchen/staff notes
        body = "Your order has been cancelled. Please contact our Biratnagar team if you need assistance.";
        break;
      default:
        body = `Your order status has changed to ${params.status.toLowerCase()}.`;
    }

    return this.sendToUser(params.userId, title, body, {
      type: "ORDER_STATUS",
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      status: params.status,
    }, "order_updates");
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
