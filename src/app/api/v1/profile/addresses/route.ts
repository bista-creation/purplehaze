import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { addressSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view your addresses.", 401);
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return jsonOk(addresses);
}

export async function POST(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to save an address.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const existingCount = await prisma.address.count({
    where: { userId: user.id },
  });
  const makeDefault = parsed.data.isDefault || existingCount === 0;

  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: user.id,
        label: parsed.data.label,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        line1: parsed.data.line1,
        line2: parsed.data.line2 || null,
        city: parsed.data.city,
        state: parsed.data.state,
        postalCode: parsed.data.postalCode || null,
        country: parsed.data.country,
        isDefault: makeDefault,
      },
    });
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.address.create",
    entity: "Address",
    entityId: address.id,
  });

  return jsonOk(address, undefined, 201);
}
