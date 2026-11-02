import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { registerSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const ip = await getClientIp();
    const limit = await checkRateLimit(`api:register:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many registration attempts. Please try again later.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await authService.registerUser(parsed.data);
    if (!result.success) {
      return jsonError("REGISTRATION_FAILED", result.message, 400);
    }

    return jsonOk(
      {
        userId: result.userId,
        requiresVerification: result.requiresVerification,
        message: result.message,
      },
      undefined,
      201,
    );
  } catch (error) {
    console.error("API register failed:", error);
    return jsonError("INTERNAL_ERROR", "An error occurred during registration.", 500);
  }
}
