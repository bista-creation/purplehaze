import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";
import { parseNepalDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function actionTone(action: string) {
  if (action.includes("delete") || action.includes("block")) return "red" as const;
  if (action.includes("create") || action.includes("paid")) return "green" as const;
  if (action.includes("update") || action.includes("change")) return "violet" as const;
  return "muted" as const;
}

function prettyDetails(value: string | null) {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireAdmin("/admin/audit");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const entity = (params.entity ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const fromDate = params.from ? parseNepalDateTime(`${params.from}T00:00`) : null;
  const toDate = params.to ? parseNepalDateTime(`${params.to}T23:59:59`) : null;

  const where = {
    ...(entity ? { entity } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
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
  };

  type AuditLogItem = Prisma.AuditLogGetPayload<{
    include: { user: { select: { name: true } } };
  }>;
  type EntityRow = { entity: string; _count: { _all: number } };

  let logs: AuditLogItem[] = [];
  let total = 0;
  let todayCount = 0;
  let entityRows: EntityRow[] = [];

  try {
    const [l, t, tc, er] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: parseNepalDateTime(
            `${new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kathmandu",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date())}T00:00`,
          )!,
        },
      },
    }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      _count: { _all: true },
      orderBy: { _count: { entity: "desc" } },
      take: 12,
    }),
    ]);
    logs = l;
    total = t;
    todayCount = tc;
    entityRows = er;
  } catch {
    console.warn("Database offline in AdminAuditPage; using empty list.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: { page?: number }) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (entity) query.set("entity", entity);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/audit?${query}` : "/admin/audit";
  }

  const exportQuery = new URLSearchParams();
  if (q) exportQuery.set("q", q);
  if (entity) exportQuery.set("entity", entity);
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);

  return (
    <>
      <AdminPageHeader
        eyebrow="Administration"
        title="Audit log"
        description={`${todayCount} recorded action${todayCount === 1 ? "" : "s"} today. Every sensitive admin change is recorded with the actor, entity, IP address and timestamp. Logs are read-only.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/api/admin/reports/audit${exportQuery.toString() ? `?${exportQuery}` : ""}`}
            >
              <Download className="size-3.5" /> Export CSV
            </Link>
          </Button>
        }
      />

      <AdminCard className="mb-4 p-4">
        <form
          action="/admin/audit"
          method="GET"
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="audit-search" className="mb-1.5 block text-xs font-semibold">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="audit-search"
                name="q"
                defaultValue={q}
                placeholder="Actor email, action, entity or ID"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label htmlFor="audit-entity" className="mb-1.5 block text-xs font-semibold">
              Entity
            </label>
            <select
              id="audit-entity"
              name="entity"
              defaultValue={entity}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All entities</option>
              {entityRows.map((row) => (
                <option key={row.entity} value={row.entity}>
                  {row.entity} ({row._count._all})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-from" className="mb-1.5 block text-xs font-semibold">
              From (Nepal)
            </label>
            <Input
              id="audit-from"
              name="from"
              type="date"
              defaultValue={params.from ?? ""}
            />
          </div>
          <div>
            <label htmlFor="audit-to" className="mb-1.5 block text-xs font-semibold">
              To (Nepal)
            </label>
            <Input
              id="audit-to"
              name="to"
              type="date"
              defaultValue={params.to ?? ""}
            />
          </div>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
      </AdminCard>

      {logs.length === 0 ? (
        <AdminEmpty
          title="No audit entries match"
          description="Sensitive actions are recorded here automatically. Try clearing the date range or search."
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">
                        {log.user?.name ?? log.actorEmail ?? "System"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.actorEmail ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionTone(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.entity}
                      {log.entityId ? (
                        <p className="max-w-[10rem] truncate font-mono text-[10px] text-muted-foreground">
                          {log.entityId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <details className="max-w-[18rem]">
                        <summary className="cursor-pointer text-[11px] font-medium text-primary">
                          View details
                        </summary>
                        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-2 font-mono text-[10px] leading-5">
                          {prettyDetails(log.details)}
                        </pre>
                      </details>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                      {log.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-[11px] leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Audit entries are written alongside the business action in the same request.
        They can be exported for compliance, but are never edited or deleted from the
        dashboard.
        {totalPages > 1 ? (
          <span className="ml-auto flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="icon-sm"
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={href({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft className="size-3.5" />
              </Link>
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="icon-sm"
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={href({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1">
            <History className="size-3.5" /> {total} entries
          </span>
        )}
      </div>
    </>
  );
}
