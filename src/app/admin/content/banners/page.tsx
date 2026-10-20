import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ContentNav } from "@/components/admin/content-nav";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdmin("/admin/content/banners");
  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

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
        uploadEnabled={Boolean(process.env.UPLOADTHING_TOKEN)}
      />
    </>
  );
}
