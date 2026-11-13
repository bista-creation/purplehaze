import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getLoyaltySummary } from "@/lib/services/loyalty.service";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user || user.role !== "CUSTOMER") {
    return jsonError("UNAUTHORIZED", "Sign in as a customer to view rewards.", 401);
  }

  try {
    return jsonOk(await getLoyaltySummary(user.id));
  } catch (error) {
    console.error("Loyalty summary API error:", error);
    return jsonError("INTERNAL_ERROR", "Could not load loyalty rewards.", 500);
  }
}
