import "server-only";
import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "./tokens";
import { jsonError } from "./response";
import type { Role } from "@/lib/shared/types";

export type ApiUserSession = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  phone?: string | null;
  image?: string | null;
};

export async function getAuthContext(req: NextRequest): Promise<ApiUserSession | null> {
  // 1. Try Bearer JWT first (Mobile App)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        // Verify user against DB to ensure not blocked and sessionVersion is current
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            image: true,
            isBlocked: true,
            sessionVersion: true,
          },
        });

        if (
          dbUser &&
          !dbUser.isBlocked &&
          dbUser.sessionVersion === payload.sessionVersion
        ) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as Role,
            phone: dbUser.phone,
            image: dbUser.image,
          };
        }
      }
    }
  }

  // 2. Fall back to Auth.js session cookies (Website / Admin Dashboard)
  try {
    const session = await auth();
    if (session?.user?.id && session.user.email) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          image: true,
          isBlocked: true,
        },
      });

      if (dbUser && !dbUser.isBlocked) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as Role,
          phone: dbUser.phone,
          image: dbUser.image,
        };
      }
    }
  } catch (err) {
    console.warn("Auth.js cookie session check error in API:", err);
  }

  return null;
}

export async function requireUserAuth(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return {
      user: null,
      errorResponse: jsonError("UNAUTHORIZED", "Please sign in to access this resource.", 401),
    } as const;
  }
  return { user, errorResponse: null } as const;
}

export async function requireAdminAuth(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return {
      user: null,
      errorResponse: jsonError("UNAUTHORIZED", "Authentication required.", 401),
    } as const;
  }

  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    return {
      user: null,
      errorResponse: jsonError("FORBIDDEN", "You do not have permission to perform this action.", 403),
    } as const;
  }

  return { user, errorResponse: null } as const;
}
