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
    if (body?.pushToken) {
      await prisma.pushToken.deleteMany({
        where: { token: body.pushToken },
      });
    } else if (user) {
      await prisma.pushToken.deleteMany({
        where: { userId: user.id },
      });
    }

    return jsonOk({ message: "Successfully signed out and unregistered push tokens." });
  } catch (error) {
    console.error("API logout failed:", error);
    return jsonError("INTERNAL_ERROR", "Logout failed.", 500);
  }
}
