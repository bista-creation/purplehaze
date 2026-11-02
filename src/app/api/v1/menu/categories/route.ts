import { menuService } from "@/lib/services/menu.service";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const categories = await menuService.getMenuCategories();
  return jsonOk(categories, { total: categories.length });
}
