import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const toggleSchema = z.object({
  dishId: z.string().min(1, "dishId is required"),
});

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view favorites.", 401);
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      dish: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(favorites);
}

export async function POST(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to save favorites.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const dish = await prisma.dish.findUnique({
    where: { id: parsed.data.dishId },
  });
  if (!dish) {
    return jsonError("NOT_FOUND", "Dish not found.", 404);
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_dishId: {
        userId: user.id,
        dishId: dish.id,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_dishId: {
          userId: user.id,
          dishId: dish.id,
        },
      },
    });
    return jsonOk({ favorited: false, message: "Removed from favorites." });
  }

  await prisma.favorite.create({
    data: {
      userId: user.id,
      dishId: dish.id,
    },
  });

  return jsonOk({ favorited: true, message: "Added to favorites." });
}
