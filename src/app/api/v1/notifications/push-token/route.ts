import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonOk, jsonZodError } from "@/lib/api/response";

const pushTokenSchema = z.object({
  token: z.string().min(1, "Expo push token is required"),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  deviceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = pushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const user = await getAuthContext(req);

  const pushToken = await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    update: {
      userId: user?.id || null,
      platform: parsed.data.platform,
      deviceId: parsed.data.deviceId || null,
      updatedAt: new Date(),
    },
    create: {
      token: parsed.data.token,
      userId: user?.id || null,
      platform: parsed.data.platform,
      deviceId: parsed.data.deviceId || null,
    },
  });

  return jsonOk({ id: pushToken.id, registered: true });
}
