import { NextRequest } from "next/server";
import { verifyGoogleIdToken, handleSocialSignIn } from "@/lib/api/oauth-verify";
import { z } from "zod";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const googleSchema = z.object({
  idToken: z.string().min(10, "Google ID token is required."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = googleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const verified = await verifyGoogleIdToken(parsed.data.idToken);
    if (!verified) {
      return jsonError("INVALID_TOKEN", "Google ID token could not be verified.", 401);
    }

    const result = await handleSocialSignIn(verified);
    return jsonOk(result);
  } catch (error) {
    console.error("Google sign-in error:", error);
    return jsonError("INTERNAL_ERROR", "Google sign-in failed.", 500);
  }
}
