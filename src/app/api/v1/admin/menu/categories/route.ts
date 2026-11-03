import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { categoryAdminSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { jsonOk, jsonZodError } from "@/lib/api/response";

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

export async function POST(req: NextRequest) {
  const authCheck = await requireAdminAuth(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = categoryAdminSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const slug = await uniqueCategorySlug(parsed.data.name);
  const category = await prisma.category.create({
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
    action: "category.create",
    entity: "Category",
    entityId: category.id,
    details: { name: category.name },
  });

  return jsonOk(category, undefined, 201);
}
