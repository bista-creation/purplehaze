import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { VenueAdmin } from "@/components/admin/venue-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { getImageUploadMode, listImageOptions } from "@/lib/uploads";
import { parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = { title: "Venues" };
export const dynamic = "force-dynamic";

export default async function AdminVenuesPage() {
  await requireAdmin("/admin/venues");
  const [venues, imageOptions] = await Promise.all([
    prisma.venue.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { bookings: true } } },
    }),
    listImageOptions("venues"),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Events & venues"
        title="Venues"
        description="Manage the spaces shown for weddings, receptions and private gatherings. Capacity and starting prices can stay unpublished when the owner prefers a quote."
      />
      <VenueAdmin
        venues={venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          description: venue.description,
          longDescription: venue.longDescription,
          image: venue.image,
          capacity: venue.capacity,
          priceFrom: venue.priceFrom,
          features: parseJsonArray(venue.features),
          isActive: venue.isActive,
          sortOrder: venue.sortOrder,
          bookingCount: venue._count.bookings,
        }))}
        uploadMode={getImageUploadMode()}
        imageOptions={imageOptions}
      />
    </>
  );
}
