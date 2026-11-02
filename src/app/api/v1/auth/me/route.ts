import { NextRequest } from "next/server";
import { requireUserAuth } from "@/lib/api/auth-context";
import { authService } from "@/lib/services/auth.service";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireUserAuth(req);
  if (errorResponse) return errorResponse;

  const profile = await authService.getUserProfile(user.id);
  if (!profile) {
    return jsonError("NOT_FOUND", "User profile not found.", 404);
  }

  return jsonOk(profile);
}
