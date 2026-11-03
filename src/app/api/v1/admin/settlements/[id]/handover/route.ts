import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { settlementService } from "@/lib/services/settlement.service";

const handoverSchema = z.object({
  amountPaisa: z.number().int().positive("Handover amount must be positive"),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const params = await props.params;
  const settlementId = params.id;
  if (!settlementId) {
    return jsonError("BAD_REQUEST", "Settlement ID is required", 400);
  }

  try {
    const body = await req.json();
    const parsed = handoverSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const result = await settlementService.recordCashHandover({
      settlementId,
      amountPaisa: parsed.data.amountPaisa,
      adminUser: { id: user.id, email: user.email },
      notes: parsed.data.notes,
    });

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to record cash handover",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request body", 400);
  }
}
