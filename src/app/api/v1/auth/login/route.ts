import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { issueTokenPair } from "@/lib/api/tokens";
import { mobileLoginSchema } from "@/lib/shared/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const body = await req.json().catch(() => null);
    const parsed = mobileLoginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    // 1. Per-IP rate limit across all login attempts (20 attempts / 10 minutes)
    const ipLimit = await checkRateLimit(`api:login:ip:${ip}`, 20, 10 * 60 * 1000);
    if (!ipLimit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many login attempts from this network. Please wait a few minutes.", 429);
    }

    // 2. Per-account rate limit against targeted account brute force (5 attempts / 10 minutes)
    const emailKey = parsed.data.email.toLowerCase().trim();
    const accountLimit = await checkRateLimit(`api:login:account:${emailKey}`, 5, 10 * 60 * 1000);
    if (!accountLimit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many login attempts for this account. Please wait a few minutes.", 429);
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
