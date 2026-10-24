import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail, MessageSquareText, Phone } from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { MessageStatusActions } from "@/components/admin/message-status-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import type { ContactMessage } from "@prisma/client";
import { requireStaff } from "@/lib/security";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireStaff("/admin/messages");
  const params = await searchParams;
  const status = ["NEW", "READ", "ARCHIVED"].includes(params.status ?? "")
    ? (params.status as "NEW" | "READ" | "ARCHIVED")
    : "ALL";
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { subject: { contains: q } },
            { message: { contains: q } },
          ],
        }
      : {}),
  };

  let messages: ContactMessage[] = [];
  let total = 0;
  let newCount = 0;
  let archivedCount = 0;

  try {
    const [mList, tot, nCount, aCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.contactMessage.count({ where: { status: "ARCHIVED" } }),
    ]);
    messages = mList;
    total = tot;
    newCount = nCount;
    archivedCount = aCount;
  } catch {
    console.warn("Database offline in AdminMessagesPage; using empty list.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: { page?: number; status?: string }) {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? status;
    if (nextStatus !== "ALL") query.set("status", nextStatus);
    if (q) query.set("q", q);
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/messages?${query}` : "/admin/messages";
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Audience"
        title="Messages"
        description={`${newCount} new contact message${newCount === 1 ? "" : "s"} · ${archivedCount} archived. Replies are sent from the restaurant's email account, not automatically by this dashboard.`}
      />

      <AdminCard className="mb-4 p-4">
        <form action="/admin/messages" method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="message-search" className="mb-1.5 block text-xs font-semibold">
              Search
            </label>
            <Input id="message-search" name="q" defaultValue={q} placeholder="Name, email, subject or text" />
          </div>
          <div>
            <label htmlFor="message-status" className="mb-1.5 block text-xs font-semibold">
              Status
            </label>
            <select
              id="message-status"
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="READ">Read</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <Button type="submit" variant="outline">Apply</Button>
        </form>
        <div className="mt-3 flex gap-1.5">
          {(
            [
              ["ALL", "All"],
              ["NEW", `New (${newCount})`],
              ["READ", "Read"],
              ["ARCHIVED", "Archived"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={href({ status: value, page: 1 })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                status === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </AdminCard>

      {messages.length === 0 ? (
        <AdminEmpty
          title="No messages found"
          description="Messages from the public contact form land here. Newsletter sign-ups are separate and not shown in this inbox."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <AdminCard key={message.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        message.status === "NEW"
                          ? "gold"
                          : message.status === "ARCHIVED"
                            ? "muted"
                            : "green"
                      }
                    >
                      {message.status}
                    </Badge>
                    <p className="font-semibold">{message.subject}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    From {message.name} · {formatDateTime(message.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <a href={`mailto:${message.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Mail className="size-3.5" /> {message.email}
                    </a>
                    {message.phone ? (
                      <a href={`tel:${message.phone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Phone className="size-3.5" /> {message.phone}
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-3xl whitespace-pre-line rounded-lg bg-muted/50 px-3 py-2 text-sm leading-6">
                    <MessageSquareText className="mr-1 inline size-3.5 text-muted-foreground" />
                    {message.message}
                  </p>
                </div>
                <div className="shrink-0">
                  <MessageStatusActions
                    id={message.id}
                    status={message.status}
                    email={message.email}
                  />
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} messages
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={href({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Link href={href({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
