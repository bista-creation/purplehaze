import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { writeAuditLog } from "@/lib/audit";
import { broadcastMenuUpdated } from "@/lib/realtime/broadcast";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Dish ID is required.", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const dish = await prisma.dish.findUnique({ where: { id } });
  if (!dish) {
    return jsonError("NOT_FOUND", "Dish not found.", 404);
  }

  const updated = await prisma.dish.update({
    where: { id },
    data: { isAvailable: parsed.data.isAvailable },
    select: { id: true, name: true, isAvailable: true },
  });

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "dish.availability.toggle",
    entity: "Dish",
    entityId: id,
    details: { name: dish.name, isAvailable: parsed.data.isAvailable },
  });

  broadcastMenuUpdated({
    type: "dish_availability",
    dishId: dish.id,
    dishName: dish.name,
    isAvailable: parsed.data.isAvailable,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);

  return jsonOk(updated);
}
