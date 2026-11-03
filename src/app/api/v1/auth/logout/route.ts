import { NextRequest } from "next/server";
import { revokeRefreshToken } from "@/lib/api/tokens";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const user = await getAuthContext(req);

    // 1. Revoke refresh token if provided
    if (body?.refreshToken) {
      await revokeRefreshToken(body.refreshToken);
    }

    // 2. Unregister push token on logout
    // Rule: remove ONLY the current device's push token; do not delete all of the user's tokens unless explicitly asked (allDevices: true)
    if (body?.pushToken) {
      await prisma.pushToken.deleteMany({
        where: { token: body.pushToken },
      });
    } else if (body?.allDevices === true && user) {
      await prisma.pushToken.deleteMany({
        where: { userId: user.id },
      });
    }

    return jsonOk({ message: "Successfully signed out." });
  } catch (error) {
    console.error("API logout failed:", error);
    return jsonError("INTERNAL_ERROR", "Logout failed.", 500);
  }
}
