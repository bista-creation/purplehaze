import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const updateSettingsSchema = z.object({
  settings: z.record(z.string()),
});

export async function GET(req: NextRequest) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const records = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of records) {
    map[s.key] = s.value;
  }

  return jsonOk(map);
}

export async function PUT(req: NextRequest) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  if (authCheck.user.role !== "ADMIN") {
    return jsonError("FORBIDDEN", "Only Administrators can modify system settings.", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const entries = Object.entries(parsed.data.settings);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "settings.update",
    entity: "Setting",
    details: { keys: Object.keys(parsed.data.settings) },
  });

  return jsonOk({ message: "Settings updated successfully." });
}
