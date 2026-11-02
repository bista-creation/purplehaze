import "server-only";
import { type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "./response";

const IDEMPOTENCY_EXPIRY_HOURS = 24;

export function computePayloadHash(payload: unknown): string {
  if (payload === undefined || payload === null) return "";
  try {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHash("sha256").update(str).digest("hex");
  } catch {
    return "";
  }
}

export async function checkIdempotency(
  req: NextRequest,
  endpoint: string,
  options?: {
    userId?: string | null;
    payload?: unknown;
  },
) {
  const key = req.headers.get("idempotency-key")?.trim();
  if (!key) return null;

  const record = await prisma.idempotencyKey.findUnique({
    where: { key },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  if (endpoint && record.endpoint !== endpoint) {
    return null;
  }

  // Cross-user reuse protection: User B reusing User A's key must NOT return A's order
  if (record.userId && options?.userId && record.userId !== options.userId) {
    return jsonError(
      "CONFLICT",
      "This idempotency key belongs to another user.",
      409,
    );
  }

  // Payload mismatch protection: same key with different body -> 409 Conflict
  if (record.requestHash && options?.payload !== undefined) {
    const currentHash = computePayloadHash(options.payload);
    if (currentHash && record.requestHash !== currentHash) {
      return jsonError(
        "CONFLICT",
        "Idempotency key reused with a different request payload.",
        409,
      );
    }
  }

  try {
    const data = JSON.parse(record.response);
    return jsonOk(data, { idempotent: true }, record.statusCode);
  } catch {
    return null;
  }
}

export async function recordIdempotency(
  key: string | null | undefined,
  endpoint: string,
  userId: string | null | undefined,
  statusCode: number,
  data: unknown,
  payload?: unknown,
) {
  if (!key) return;

  const requestHash = payload !== undefined ? computePayloadHash(payload) : null;
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000);
  await prisma.idempotencyKey
    .upsert({
      where: { key },
      update: {
        response: JSON.stringify(data),
        statusCode,
        expiresAt,
        requestHash,
      },
      create: {
        key,
        endpoint,
        userId: userId ?? null,
        requestHash,
        response: JSON.stringify(data),
        statusCode,
        expiresAt,
      },
    })
    .catch((err) => console.warn("Failed to record idempotency key:", err));
}
