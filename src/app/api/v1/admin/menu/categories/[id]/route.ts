import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnlyAuth } from "@/lib/api/auth-context";
import { categoryAdminSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

async function uniqueCategorySlug(name: string, currentId?: string) {
  const base = slugify(name) || `category-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Category ID is required.", 400);
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("NOT_FOUND", "Category not found.", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = categoryAdminSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const slug = await uniqueCategorySlug(parsed.data.name, id);
  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      image: parsed.data.image || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "category.update",
    entity: "Category",
    entityId: id,
    details: { name: updated.name },
  });

  return jsonOk(updated);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const authCheck = await requireAdminOnlyAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const params = await props.params;
  const { id } = params;
  if (!id) {
    return jsonError("BAD_REQUEST", "Category ID is required.", 400);
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { dishes: true } } },
  });

  if (!category) {
    return jsonError("NOT_FOUND", "Category not found.", 404);
  }

  if (category._count.dishes > 0) {
    return jsonError(
      "CONFLICT",
      "Move or delete the dishes in this category first, or hide it instead.",
      409,
    );
  }

  await prisma.category.delete({ where: { id } });

  await writeAuditLog({
    userId: authCheck.user.id,
    actorEmail: authCheck.user.email,
    action: "category.delete",
    entity: "Category",
    entityId: id,
    details: { name: category.name },
  });

  return jsonOk({ message: "Category deleted successfully." });
}
