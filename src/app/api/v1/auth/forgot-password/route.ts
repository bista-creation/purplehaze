import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { forgotPasswordSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:forgot-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many requests. Please wait a few minutes.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await authService.requestPasswordReset(parsed.data.email);
    return jsonOk({
      message: "If an account exists with that email, a password reset link is on its way.",
      devUrl: result.devUrl,
    });
  } catch (error) {
    console.error("Forgot password API failed:", error);
    return jsonError("INTERNAL_ERROR", "Password reset request failed.", 500);
  }
}
