import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const verifyLicenseSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminOnlyAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const riderProfileId = params.id;
  if (!riderProfileId) {
    return jsonError("BAD_REQUEST", "Rider ID is required", 400);
  }

  try {
    const body = await req.json();
    const parsed = verifyLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : undefined;

    const result = await riderService.verifyLicense(
      riderProfileId,
      parsed.data.status,
      {
        id: user.id,
        email: user.email,
      },
      expiresAt
    );

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to verify license",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
