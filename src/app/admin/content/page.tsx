import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  ImageIcon,
  LayoutTemplate,
  MessageSquareQuote,
  Settings2,
  Star,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { ContentNav } from "@/components/admin/content-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdmin("/admin/content");
  const [gallery, banners, testimonials, latestGallery, latestTestimonials] =
    await Promise.all([
      prisma.galleryImage.count(),
      prisma.banner.count(),
      prisma.testimonial.count(),
      prisma.galleryImage.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, title: true, category: true, isActive: true },
      }),
      prisma.testimonial.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, name: true, isActive: true, createdAt: true },
      }),
    ]);

  const cards = [
    {
      href: "/admin/content/gallery",
      label: "Gallery",
      icon: ImageIcon,
      count: gallery,
      description: "Restaurant, garden, food and event photography.",
    },
    {
      href: "/admin/content/banners",
      label: "Homepage banners",
      icon: LayoutTemplate,
      count: banners,
      description: "Scheduled promotional strip below the gallery.",
    },
    {
      href: "/admin/content/testimonials",
      label: "Testimonials",
      icon: MessageSquareQuote,
      count: testimonials,
      description: "Permissioned guest quotes shown on the home page.",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Website"
        title="Content"
        description="Manage the visual content that appears across the public website. Hero and About copy live in Website settings. Delete placeholder photos once real restaurant photography is uploaded."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings?tab=content">
              <Settings2 className="size-4" /> Edit hero & SEO copy
            </Link>
          </Button>
        }
      />
      <ContentNav />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="size-5" />
              </span>
              <Badge variant="violet">{card.count}</Badge>
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">
              {card.label}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {card.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              Manage <ArrowRight className="size-3" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Latest gallery additions
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/content/gallery">View gallery</Link>
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {latestGallery.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
                No gallery photos yet.
              </li>
            ) : (
              latestGallery.map((image) => (
                <li
                  key={image.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold">{image.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {image.category}
                    </p>
                  </div>
                  <Badge variant={image.isActive ? "green" : "muted"}>
                    {image.isActive ? "Live" : "Hidden"}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Latest testimonials
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/content/testimonials">View all</Link>
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {latestTestimonials.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
                No testimonials yet.
              </li>
            ) : (
              latestTestimonials.map((testimonial) => (
                <li
                  key={testimonial.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold">{testimonial.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Added {formatDateTime(testimonial.createdAt)}
                    </p>
                  </div>
                  <Badge variant={testimonial.isActive ? "green" : "muted"}>
                    {testimonial.isActive ? "Published" : "Hidden"}
                  </Badge>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <Ban className="mt-0.5 size-3.5 shrink-0" />
            Do not copy guest reviews or photos from Facebook without permission. The
            seed testimonials are inactive placeholders.
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mt-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Star className="size-5 text-gold" /> Publishing checklist
        </h2>
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
          <li>• Replace all stock placeholders with real Purple Haze photos.</li>
          <li>• Keep alt text descriptive for accessibility and SEO.</li>
          <li>• Confirm guest permission before publishing testimonials.</li>
          <li>• Schedule seasonal banners in Nepal time and check the links.</li>
          <li>• Review hero and SEO copy under Website settings.</li>
          <li>• Moderation queue lives under Reviews, not Content.</li>
        </ul>
      </AdminCard>
    </>
  );
}
