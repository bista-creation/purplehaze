import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { changePasswordSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function PUT(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to change your password.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!record?.passwordHash) {
    return jsonError(
      "OAUTH_ACCOUNT",
      "This account signs in with Google or Apple. Please set a password using the forgot password flow.",
      400,
    );
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!isValid) {
    return jsonError("INVALID_CREDENTIALS", "Your current password is incorrect.", 400);
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    }),
  ]);

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.password.change",
    entity: "User",
    entityId: user.id,
  });

  return jsonOk({ message: "Password updated successfully. Please sign in again." });
}
