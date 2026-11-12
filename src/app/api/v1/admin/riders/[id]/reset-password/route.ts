import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters").optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const riderProfileId = params.id;
  if (!riderProfileId) {
    return jsonError("BAD_REQUEST", "Rider ID is required", 400);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await riderService.adminResetRiderPassword(
      riderProfileId,
      {
        id: user.id,
        email: user.email,
      },
      parsed.data.temporaryPassword
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to reset rider password",
        result.error?.statusCode || 400
      );
    }

    return jsonOk({
      riderId: result.data.riderId,
      email: result.data.email,
      name: result.data.name,
      temporaryPassword: result.data.temporaryPassword,
      message: "Rider password has been reset. Share the temporary password with the rider.",
    });
  } catch (error) {
    console.error("Failed to reset rider password:", error);
    return jsonError("INTERNAL_ERROR", "Internal server error resetting password", 500);
  }
}
