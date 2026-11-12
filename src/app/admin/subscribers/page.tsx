import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  MailCheck,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { SubscriberActions } from "@/components/admin/subscriber-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import type { NewsletterSubscriber } from "@prisma/client";
import { requireStaff } from "@/lib/security";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireStaff("/admin/subscribers");
  const params = await searchParams;
  const statusParam = (params.status ?? "").toUpperCase();
  const status = ["ACTIVE", "INACTIVE"].includes(statusParam)
    ? statusParam
    : "ALL";
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    ...(status === "ACTIVE" ? { isActive: true } : {}),
    ...(status === "INACTIVE" ? { isActive: false } : {}),
    ...(q ? { email: { contains: q } } : {}),
  };

  let subscribers: NewsletterSubscriber[] = [];
  let totalFiltered = 0;
  let totalAll = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  try {
    const [sList, totFiltered, totAll, aCount, inCount] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
      prisma.newsletterSubscriber.count({ where: { isActive: false } }),
    ]);
    subscribers = sList;
    totalFiltered = totFiltered;
    totalAll = totAll;
    activeCount = aCount;
    inactiveCount = inCount;
  } catch (error) {
    console.error("Failed to load subscribers:", error);
  }

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    const merged = {
      status: status !== "ALL" ? status : undefined,
      q: q || undefined,
      page: page > 1 ? page : undefined,
      ...overrides,
    };
    for (const [key, val] of Object.entries(merged)) {
      if (val !== undefined && val !== "") query.set(key, String(val));
    }
    const qs = query.toString();
    return qs ? `/admin/subscribers?${qs}` : "/admin/subscribers";
  }

  const exportUrl = `/api/admin/subscribers/export?${new URLSearchParams({
    ...(status !== "ALL" ? { status } : {}),
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audience & Marketing"
        title="Newsletter Subscribers"
        description="Website visitors who subscribed via the footer newsletter form. Export contacts or manage active subscriptions."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={exportUrl} download>
              <Download className="mr-1.5 size-4" /> Export CSV
            </a>
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
              <p className="font-display text-2xl font-bold">{totalAll}</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Subscriptions</p>
              <p className="font-display text-2xl font-bold text-emerald-400">
                {activeCount}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-500/10 text-zinc-400">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inactive / Unsubscribed</p>
              <p className="font-display text-2xl font-bold text-muted-foreground">
                {inactiveCount}
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Filter and Search Bar */}
      <AdminCard className="p-4">
        <form
          action="/admin/subscribers"
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Status Segmented Buttons */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: "ALL", label: `All (${totalAll})` },
              { key: "ACTIVE", label: `Active (${activeCount})` },
              { key: "INACTIVE", label: `Inactive (${inactiveCount})` },
            ].map((tab) => {
              const isSelected = status === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildUrl({ status: tab.key, page: 1 })}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            {status !== "ALL" ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search email..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
              Filter
            </Button>
            {q ? (
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <Link href={buildUrl({ q: undefined, page: 1 })}>Reset</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </AdminCard>

      {/* Table / List */}
      {subscribers.length === 0 ? (
        <AdminEmpty
          title="No subscribers found"
          description={
            q
              ? `No subscribers matched the search query "${q}".`
              : "No newsletter subscriptions have been recorded yet. When guests subscribe in the website footer, their emails will appear here."
          }
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Subscriber Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subscribed Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <MailCheck className="size-3.5" />
                        </div>
                        <a
                          href={`mailto:${sub.email}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {sub.email}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sub.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                        >
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(sub.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SubscriberActions
                        id={sub.id}
                        email={sub.email}
                        isActive={sub.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Showing Page <span className="font-semibold text-foreground">{page}</span>{" "}
                of <span className="font-semibold text-foreground">{totalPages}</span> (
                {totalFiltered} subscribers)
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page <= 1}
                >
                  {page > 1 ? (
                    <Link href={buildUrl({ page: page - 1 })}>
                      <ChevronLeft className="mr-1 size-3.5" /> Previous
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="mr-1 size-3.5" /> Previous
                    </span>
                  )}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page >= totalPages}
                >
                  {page < totalPages ? (
                    <Link href={buildUrl({ page: page + 1 })}>
                      Next <ChevronRight className="ml-1 size-3.5" />
                    </Link>
                  ) : (
                    <span>
                      Next <ChevronRight className="ml-1 size-3.5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </AdminCard>
      )}
    </div>
  );
}
