import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { ReviewControls } from "@/components/admin/review-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireStaff("/admin/reviews");
  const params = await searchParams;
  const status = ["pending", "approved", "featured", "all"].includes(params.status ?? "")
    ? (params.status as "pending" | "approved" | "featured" | "all")
    : "pending";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const where =
    status === "pending"
      ? { isApproved: false }
      : status === "approved"
        ? { isApproved: true }
        : status === "featured"
          ? { isApproved: true, isFeatured: true }
          : {};

  const [reviews, total, pendingCount, featuredCount, average] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.review.count({ where: { isApproved: true, isFeatured: true } }),
    prisma.review.aggregate({
      where: { isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(nextPage: number, nextStatus = status) {
    const query = new URLSearchParams();
    if (nextStatus !== "pending") query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    return query.toString() ? `/admin/reviews?${query}` : "/admin/reviews";
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Audience"
        title="Reviews"
        description="Only approved reviews appear publicly. Featuring a review also selects it for the home page. Sample reviews in the demo seed are clearly labelled test content."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
            <Star className="size-4 fill-gold text-gold" />
            <span className="font-semibold">
              {average._avg.rating ? average._avg.rating.toFixed(1) : "—"}
            </span>
            <span className="text-muted-foreground">
              from {average._count._all} approved
            </span>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            ["pending", `Pending (${pendingCount})`],
            ["approved", "Approved"],
            ["featured", `Featured (${featuredCount})`],
            ["all", "All reviews"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={href(1, value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              status === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <AdminEmpty
          title="No reviews here"
          description="Customers can review an order after it is marked completed. Reviews wait here for moderation before they appear publicly."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <AdminCard key={review.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            "size-3.5",
                            index < review.rating
                              ? "fill-gold text-gold"
                              : "text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                    {review.isApproved ? (
                      <Badge variant="green">Approved</Badge>
                    ) : (
                      <Badge variant="gold">Pending</Badge>
                    )}
                    {review.isFeatured ? <Badge variant="violet">Featured</Badge> : null}
                  </div>
                  {review.title ? (
                    <p className="mt-2 font-semibold">{review.title}</p>
                  ) : null}
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {review.comment}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {review.user?.name ?? "Guest"} · {review.user?.email ?? "No account"}
                    {review.order ? (
                      <>
                        {" "}·{" "}
                        <Link
                          href={`/admin/orders?q=${review.order.orderNumber}`}
                          className="text-primary hover:underline"
                        >
                          {review.order.orderNumber}
                        </Link>
                      </>
                    ) : null}
                    {" "}· {formatDateTime(review.createdAt)}
                  </p>
                </div>
                <div className="shrink-0">
                  <ReviewControls
                    reviewId={review.id}
                    isApproved={review.isApproved}
                    isFeatured={review.isFeatured}
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
            Page {page} of {totalPages} · {total} reviews
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={href(page - 1)} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Link href={href(page + 1)} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
