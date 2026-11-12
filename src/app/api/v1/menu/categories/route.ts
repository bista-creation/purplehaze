import { menuService } from "@/lib/services/menu.service";
import { jsonOk } from "@/lib/api/response";

export const revalidate = 60;

export async function GET() {
  const categories = await menuService.getMenuCategories();
  return jsonOk(categories, { total: categories.length }, 200, {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  });
}
