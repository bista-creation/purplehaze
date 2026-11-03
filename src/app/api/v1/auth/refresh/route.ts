import { NextRequest } from "next/server";
import { rotateRefreshToken } from "@/lib/api/tokens";
import { refreshTokenSchema } from "@/lib/shared/schemas";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await rotateRefreshToken(parsed.data.refreshToken);
    if (!result.success) {
      if (result.error === "REUSE_DETECTED") {
        return jsonError(
          "TOKEN_REUSE_DETECTED",
          "Invalid session. Token reuse detected and all family tokens have been revoked.",
          401,
        );
      }
      return jsonError(result.error, result.message, 401);
    }

    return jsonOk({
      tokens: result.tokens,
      user: result.user,
    });
  } catch (error) {
    console.error("Token refresh failed:", error);
    return jsonError("INTERNAL_ERROR", "Token refresh failed.", 500);
  }
}
