import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { registerSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { issueTokenPair } from "@/lib/api/tokens";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:register:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many registration attempts. Please try again later.", 429);
    }

    const body = await req.json().catch(() => null);
    const bodyWithDefaults = {
      ...body,
      confirmPassword: body?.confirmPassword || body?.password,
      acceptTerms: body?.acceptTerms !== undefined ? body.acceptTerms : true,
    };
    const parsed = registerSchema.safeParse(bodyWithDefaults);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await authService.registerUser(parsed.data, { autoVerify: true });
    if (!result.success || !result.userId) {
      return jsonError("REGISTRATION_FAILED", result.message, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return jsonError("REGISTRATION_FAILED", "Failed to retrieve registered user.", 500);
    }

    const tokens = await issueTokenPair(user);

    return jsonOk(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          image: user.image,
        },
        tokens,
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
