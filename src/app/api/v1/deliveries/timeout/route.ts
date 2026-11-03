import { NextRequest } from "next/server";
import { z } from "zod";
import { getQStashReceiver } from "@/lib/qstash";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { deliveryService } from "@/lib/services/delivery.service";

const timeoutSchema = z.object({
  deliveryId: z.string().min(1, "Delivery ID is required"),
  assignmentAttemptId: z.string().min(1, "Assignment attempt ID is required"),
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Signature verification when QStash receiver is configured
  const receiver = getQStashReceiver();
  if (receiver) {
    const signature = req.headers.get("upstash-signature");
    if (!signature) {
      return jsonError("UNAUTHORIZED", "Missing Upstash signature header", 401);
    }

    try {
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });

      if (!isValid) {
        return jsonError("UNAUTHORIZED", "Invalid QStash signature", 401);
      }
    } catch (err) {
      console.error("[QStash Signature Error]:", err);
      return jsonError("UNAUTHORIZED", "Signature verification failed", 401);
    }
  }

  try {
    const body = JSON.parse(rawBody);
    const parsed = timeoutSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await deliveryService.handleAssignmentTimeout(
      parsed.data.deliveryId,
      parsed.data.assignmentAttemptId
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to process timeout",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON payload", 400);
  }
}
