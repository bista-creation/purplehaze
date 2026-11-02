import { NextRequest } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { resetPasswordSchema } from "@/lib/validations";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
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
