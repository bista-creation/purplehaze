import { NextRequest } from "next/server";
import { z } from "zod";
import { mayaService } from "@/lib/services/maya.service";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { getClientIp } from "@/lib/security";

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(1000),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());

    const body = await req.json().catch(() => null);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const user = await getAuthContext(req);

    const result = await mayaService.chat({
      message: parsed.data.message,
      history: parsed.data.history,
      userId: user?.id,
      clientIp: ip,
    });

    if (!result.success) {
      return jsonError("MAYA_UNAVAILABLE", result.error || "Assistant unavailable", result.status || 500);
    }

    return jsonOk(result.data);
  } catch (error) {
    console.error("Maya chat error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to process message.", 500);
  }
}
