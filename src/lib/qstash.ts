import "server-only";
import { Client, Receiver } from "@upstash/qstash";
import { SITE } from "./constants";

export function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  return new Client({ token });
}

export function getQStashReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) return null;
  return new Receiver({
    currentSigningKey,
    nextSigningKey,
  });
}

export interface ScheduleTimeoutOptions {
  deliveryId: string;
  assignmentAttemptId: string;
  delaySeconds?: number;
}

/**
 * Schedules an idempotent delayed webhook callback via Upstash QStash.
 * When the timer expires, QStash posts to /api/v1/deliveries/timeout.
 */
export async function scheduleAssignmentTimeout({
  deliveryId,
  assignmentAttemptId,
  delaySeconds = 120,
}: ScheduleTimeoutOptions): Promise<{ success: boolean; messageId?: string }> {
  const client = getQStashClient();
  if (!client) {
    console.warn(
      `[QStash] QSTASH_TOKEN missing. Skipping remote delay timer for delivery ${deliveryId}.`
    );
    return { success: false };
  }

  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || SITE.url;
  const targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/deliveries/timeout`;

  // Headers: include Vercel staging protection bypass if configured, but NEVER in production
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const isStaging = process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production";
  if (isStaging && process.env.VERCEL_PROTECTION_BYPASS) {
    headers["Upstash-Forward-x-vercel-protection-bypass"] = process.env.VERCEL_PROTECTION_BYPASS;
  }

  try {
    const res = await client.publishJSON({
      url: targetUrl,
      body: {
        deliveryId,
        assignmentAttemptId,
      },
      delay: delaySeconds,
      retries: 2,
      headers,
    });

    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error("[QStash] Failed to schedule assignment timeout:", error);
    return { success: false };
  }
}
