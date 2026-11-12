import { getActiveDeliveryZones } from "@/lib/queries";
import { jsonOk } from "@/lib/api/response";

export const revalidate = 300;

export async function GET() {
  const zones = await getActiveDeliveryZones();
  return jsonOk(zones, undefined, 200, {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  });
}
