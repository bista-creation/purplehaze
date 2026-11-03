import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const formatted = venues.map((v) => {
    let features: string[] = [];
    try {
      features = JSON.parse(v.features);
    } catch {
      features = [];
    }
    return {
      ...v,
      features,
    };
  });

  return jsonOk(formatted);
}
