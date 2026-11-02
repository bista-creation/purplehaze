import { NextRequest } from "next/server";
import { revokeRefreshToken } from "@/lib/api/tokens";
import { refreshTokenSchema } from "@/lib/shared/schemas";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.refreshToken) {
      return jsonOk({ message: "Signed out." });
    }

    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    await revokeRefreshToken(parsed.data.refreshToken);
    return jsonOk({ message: "Successfully signed out and revoked token." });
  } catch (error) {
    console.error("API logout failed:", error);
    return jsonError("INTERNAL_ERROR", "Logout failed.", 500);
  }
}
