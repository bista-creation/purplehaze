import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { resetPasswordSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:reset-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many password reset attempts. Please wait.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await authService.resetPassword(parsed.data.token, parsed.data.password);
    if (!result.success) {
      return jsonError("RESET_FAILED", result.message, 400);
    }

    return jsonOk({ message: result.message });
  } catch (error) {
    console.error("Reset password API failed:", error);
    return jsonError("INTERNAL_ERROR", "Password reset failed.", 500);
  }
}
