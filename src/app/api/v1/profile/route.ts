import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { profileSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view your profile.", 401);
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return jsonError("NOT_FOUND", "User not found.", 404);
  }

  return jsonOk(profile);
}

export async function PUT(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to update your profile.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      image: parsed.data.image || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      image: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.profile.update",
    entity: "User",
    entityId: user.id,
  });

  return jsonOk(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to delete your account.", 401);
  }

  // Execute account deletion batch: revoke all tokens, delete push tokens, addresses, and favorites
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.pushToken.deleteMany({ where: { userId: user.id } }),
    prisma.favorite.deleteMany({ where: { userId: user.id } }),
    prisma.address.deleteMany({ where: { userId: user.id } }),
    prisma.order.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    }),
    prisma.notificationRead.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.account.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.profile.delete",
    entity: "User",
    entityId: user.id,
    details: { reason: "User requested account deletion" },
  });

  return jsonOk({
    message: "Your account and all associated tokens, addresses, and favorites have been deleted.",
  });
}
