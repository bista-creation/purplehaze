import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { addressSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Address ID is required.", 400);
  }

  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in.", 401);
  }

  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Address not found.", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const makeDefault = parsed.data.isDefault ?? existing.isDefault;

  const updated = await prisma.$transaction(async (tx) => {
    if (makeDefault && !existing.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data: {
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
    action: "account.address.update",
    entity: "Address",
    entityId: id,
  });

  return jsonOk(updated);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Address ID is required.", 400);
  }

  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in.", 401);
  }

  const address = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!address) {
    return jsonError("NOT_FOUND", "Address not found.", 404);
  }

  await prisma.address.delete({ where: { id: address.id } });

  // If deleted address was default, promote the earliest remaining address to default
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.address.delete",
    entity: "Address",
    entityId: id,
  });

  return jsonOk({ message: "Address deleted successfully." });
}
