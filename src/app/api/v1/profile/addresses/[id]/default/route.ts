import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(
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

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    }),
  ]);

  return jsonOk({ message: "Default address updated successfully." });
}
