import { NextRequest } from "next/server";
import { menuService } from "@/lib/services/menu.service";
import { jsonOk } from "@/lib/api/response";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get("featured") === "true";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || (featured ? 8 : 20))));

  if (featured) {
    const dishes = await menuService.getFeaturedDishes(limit);
    return jsonOk(dishes, { total: dishes.length }, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  }

  const categorySlug = searchParams.get("category") || undefined;
  const isVeg = searchParams.has("isVeg") ? searchParams.get("isVeg") === "true" : undefined;
  const isSpicy = searchParams.has("isSpicy") ? searchParams.get("isSpicy") === "true" : undefined;

  const dishes = await menuService.searchDishes(undefined, {
    categorySlug,
    isVeg,
    isSpicy,
  });

  return jsonOk(dishes, { total: dishes.length, limit }, 200, {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  });
}
