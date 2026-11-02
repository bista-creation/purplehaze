import { NextRequest } from "next/server";
import { menuService } from "@/lib/services/menu.service";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const dish = await menuService.getDishBySlug(slug);

  if (!dish) {
    return jsonError("NOT_FOUND", "Dish not found.", 404);
  }

  return jsonOk(dish);
}
