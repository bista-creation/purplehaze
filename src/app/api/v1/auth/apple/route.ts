import { NextRequest } from "next/server";
import { verifyAppleIdToken, handleSocialSignIn } from "@/lib/api/oauth-verify";
import { z } from "zod";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const appleSchema = z.object({
  idToken: z.string().min(10, "Apple ID token is required."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = appleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const verified = await verifyAppleIdToken(parsed.data.idToken);
    if (!verified) {
      return jsonError("INVALID_TOKEN", "Apple ID token could not be verified.", 401);
    }

    const result = await handleSocialSignIn(verified);
    return jsonOk(result);
  } catch (error) {
    console.error("Apple sign-in error:", error);
    return jsonError("INTERNAL_ERROR", "Apple sign-in failed.", 500);
  }
}
