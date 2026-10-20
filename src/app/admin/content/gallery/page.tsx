import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ContentNav } from "@/components/admin/content-nav";
import { GalleryAdmin } from "@/components/admin/gallery-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { getImageUploadMode } from "@/lib/uploads";

export const metadata: Metadata = { title: "Gallery" };
export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAdmin("/admin/content/gallery");
  const images = await prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Website content"
        title="Gallery"
        description="Real photography only. Upload photos directly, choose an existing image, or place files under public/images, then describe them for screen readers. Facebook images require permission from the restaurant owner."
      />
      <ContentNav />
      <GalleryAdmin
        images={images.map((image) => ({
          id: image.id,
          url: image.url,
          title: image.title,
          category: image.category,
          sortOrder: image.sortOrder,
          isActive: image.isActive,
        }))}
        uploadMode={getImageUploadMode()}
      />
    </>
  );
}
