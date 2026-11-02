import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { issueTokenPair } from "@/lib/api/tokens";
import { mobileLoginSchema } from "@/lib/shared/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const ip = await getClientIp();
    const body = await req.json().catch(() => null);
    const parsed = mobileLoginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const limit = await checkRateLimit(`api:login:${ip}:${parsed.data.email}`, 10, 10 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many login attempts. Please wait a few minutes.", 429);
    }

    const authResult = await authService.verifyCredentials(parsed.data.email, parsed.data.password);
    if (!authResult.success) {
      if (authResult.code === "UNVERIFIED_EMAIL") {
        return jsonError("UNVERIFIED_EMAIL", authResult.message, 403);
      }
      return jsonError("INVALID_CREDENTIALS", authResult.message, 401);
    }

    const tokens = await issueTokenPair(authResult.user);

    return jsonOk({
      user: {
        id: authResult.user.id,
        name: authResult.user.name,
        email: authResult.user.email,
        phone: authResult.user.phone,
        role: authResult.user.role,
        image: authResult.user.image,
      },
      tokens,
    });
  } catch (error) {
    console.error("API login failed:", error);
    return jsonError("INTERNAL_ERROR", "Login failed. Please try again.", 500);
  }
}
