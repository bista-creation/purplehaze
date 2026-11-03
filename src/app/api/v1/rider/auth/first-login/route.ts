import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const firstLoginSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRiderAuth(req, {
    allowMustChangePassword: true,
  });
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = firstLoginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await riderService.firstLoginChangePassword(
      user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to update password",
        result.error?.statusCode || 400
      );
    }

    return jsonOk({
      message: "Password updated successfully. Please use your new password going forward.",
    });
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
