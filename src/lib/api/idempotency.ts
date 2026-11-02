import "server-only";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk } from "./response";

const IDEMPOTENCY_EXPIRY_HOURS = 24;

export async function checkIdempotency(req: NextRequest, endpoint: string) {
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
) {
  if (!key) return;

  const expiresAt = new Date(Date.now() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000);
  await prisma.idempotencyKey.upsert({
    where: { key },
    update: {
      response: JSON.stringify(data),
      statusCode,
      expiresAt,
    },
    create: {
      key,
      endpoint,
      userId: userId ?? null,
      response: JSON.stringify(data),
      statusCode,
      expiresAt,
    },
  }).catch((err) => console.warn("Failed to record idempotency key:", err));
}
