import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ContentNav } from "@/components/admin/content-nav";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { prisma } from "@/lib/prisma";
import type { Banner } from "@prisma/client";
import { requireAdmin } from "@/lib/security";
import { getImageUploadMode } from "@/lib/uploads";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdmin("/admin/content/banners");
  let banners: Banner[] = [];
  try {
    banners = await prisma.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    console.warn("Database offline in AdminBannersPage; using empty list.");
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Website content"
        title="Homepage banners"
        description="The first active, in-window banner appears on the homepage. Use banners for festival menus, live music or seasonal offers, and always link to a page that exists."
      />
      <ContentNav />
      <BannerAdmin
        banners={banners.map((banner) => ({
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          image: banner.image,
          ctaLabel: banner.ctaLabel,
          ctaHref: banner.ctaHref,
          sortOrder: banner.sortOrder,
          isActive: banner.isActive,
          startsAt: banner.startsAt?.toISOString() ?? null,
          endsAt: banner.endsAt?.toISOString() ?? null,
        }))}
        uploadMode={getImageUploadMode()}
      />
    </>
  );
}
