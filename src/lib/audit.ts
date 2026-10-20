import "server-only";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

interface AuditInput {
  userId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
}

export async function writeAuditLog(input: AuditInput) {
  try {
    const ip = await getClientIp();
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        actorEmail: input.actorEmail ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        details:
          typeof input.details === "string" || input.details == null
            ? input.details ?? null
            : JSON.stringify(input.details),
        ip,
      },
    });
  } catch (error) {
    // Audit failures must never take down a customer-facing operation.
    console.error("Audit log failed", error);
  }
}
