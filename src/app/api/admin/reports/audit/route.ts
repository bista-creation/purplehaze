import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { resolveReportRange } from "@/lib/report-range";
import { formatDateTime } from "@/lib/utils";

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams, { defaultDays: null });
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const entity = (searchParams.get("entity") ?? "").trim().slice(0, 60);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(q
        ? {
            OR: [
              { actorEmail: { contains: q } },
              { action: { contains: q } },
              { entity: { contains: q } },
              { entityId: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5_000,
    include: { user: { select: { name: true } } },
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "report.export.audit",
    entity: "AuditLog",
    details: { rows: logs.length, q: q || null, entity: entity || null, range },
  });

  const body = toCsv(
    [
      { key: "createdAt", label: "When (Nepal)" },
      { key: "actorName", label: "Actor name" },
      { key: "actorEmail", label: "Actor email" },
      { key: "action", label: "Action" },
      { key: "entity", label: "Entity" },
      { key: "entityId", label: "Entity ID" },
      { key: "details", label: "Details" },
      { key: "ip", label: "IP address" },
    ],
    logs.map((log) => ({
      createdAt: formatDateTime(log.createdAt),
      actorName: log.user?.name ?? "System",
      actorEmail: log.actorEmail ?? "",
      action: log.action,
      entity: log.entity,
      entityId: log.entityId ?? "",
      details: log.details ?? "",
      ip: log.ip ?? "",
    })),
  );

  return csvResponse(
    `purple-haze-audit${range ? `-${range.fromDay}-to-${range.toDay}` : ""}.csv`,
    body,
  );
}
