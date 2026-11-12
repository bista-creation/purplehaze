import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api/response";
import { CANONICAL_VENUES } from "@/lib/venues-data";

export const revalidate = 300;

export async function GET() {
  let venues = await prisma.venue.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  }).catch(() => []);

  if (!venues || venues.length === 0) {
    venues = CANONICAL_VENUES.map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      longDescription: v.longDescription,
      image: v.image,
      capacity: v.capacity,
      priceFrom: null,
      features: JSON.stringify(v.features),
      isActive: true,
      sortOrder: v.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  const formatted = venues.map((v) => {
    let features: string[] = [];
    try {
      features = JSON.parse(v.features);
    } catch {
      features = [];
    }

    const canonical = CANONICAL_VENUES.find((c) => c.slug === v.slug);
    const primaryImage = v.image || canonical?.image || "/images/venues/banquet.jpg";
    const absoluteImage = primaryImage.startsWith("http")
      ? primaryImage
      : `https://purplehaze-nine.vercel.app${primaryImage}`;

    const gallery = canonical?.gallery
      ? canonical.gallery.map((img) =>
          img.startsWith("http") ? img : `https://purplehaze-nine.vercel.app${img}`
        )
      : [absoluteImage];

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      longDescription: v.longDescription,
      capacity: v.capacity,
      capacityDisplay: v.capacity ? `Up to ${v.capacity} guests` : "Flexible outdoor capacity",
      suitableFor: canonical?.suitableFor || [],
      priceFrom: v.priceFrom,
      image: absoluteImage,
      images: gallery,
      features,
    };
  });

  return jsonOk(formatted, undefined, 200, {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  });
}
