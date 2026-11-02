import { NextRequest } from "next/server";
import { menuService } from "@/lib/services/menu.service";
import { jsonOk } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const isVeg = searchParams.has("isVeg") ? searchParams.get("isVeg") === "true" : undefined;
  const isSpicy = searchParams.has("isSpicy") ? searchParams.get("isSpicy") === "true" : undefined;

  const dishes = await menuService.searchDishes(q, {
    categorySlug: category,
    isVeg,
    isSpicy,
  });

  return jsonOk(dishes, { count: dishes.length, query: q });
}
