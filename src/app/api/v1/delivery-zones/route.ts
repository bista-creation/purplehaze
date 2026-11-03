import { NextResponse } from "next/server";
import { getActiveDeliveryZones } from "@/lib/queries";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const zones = await getActiveDeliveryZones();
  return jsonOk(zones);
}
