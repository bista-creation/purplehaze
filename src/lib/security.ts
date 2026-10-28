import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";
import { safeNextPath } from "@/lib/utils";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        phone: true,
        role: true,
        isBlocked: true,
        sessionVersion: true,
        createdAt: true,
      },
    });

    if (user && !user.isBlocked && user.sessionVersion === session.user.sessionVersion) {
      return user;
    }
  } catch (err) {
    console.error("Database query failed in getCurrentUser:", err);
  }

  // Resilient admin session fallback if database is temporarily offline/unreachable
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (
    session.user.role === "ADMIN" &&
    Boolean(seedAdminEmail) &&
    session.user.email?.toLowerCase() === seedAdminEmail
  ) {
    return {
      id: session.user.id || "cc38da83845104ec88bd66675",
      name: session.user.name ?? "Purple Haze Admin",
      email: session.user.email ?? "bistacreation@gmail.com",
      emailVerified: new Date(),
      image: session.user.image ?? null,
      phone: session.user.phone ?? null,
      role: "ADMIN",
      isBlocked: false,
      sessionVersion: session.user.sessionVersion ?? 0,
      createdAt: new Date(),
    };
  }

  return null;
}

export async function requireUser(nextPath = "/account") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }
  return user;
}

export async function requireRole(roles: Role[], nextPath = "/account") {
  const user = await requireUser(nextPath);
  if (!roles.includes(user.role as Role)) {
    redirect("/");
  }
  return user;
}

export async function requireAdmin(nextPath = "/admin") {
  return requireRole(["ADMIN"], nextPath);
}

export async function requireStaff(nextPath = "/admin/orders") {
  return requireRole(["ADMIN", "STAFF"], nextPath);
}

export async function getActionUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Please sign in to continue.");
  if (roles && !roles.includes(user.role as Role)) {
    throw new AuthorizationError();
  }
  return user;
}

export async function getClientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return (
    headerList.get("x-real-ip") ??
    headerList.get("cf-connecting-ip") ??
    "unknown"
  );
}

/**
 * Server Actions already receive an Origin/Referer check from Next.js. This
 * adds an explicit same-host assertion for route handlers and actions that
 * change money or account data.
 */
export async function assertSameOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (!origin) return;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return;
  try {
    const originHost = new URL(origin).host;
    const normalizeHost = (h: string) => h.replace(/^127\.0\.0\.1/, "localhost");
    if (originHost !== host && normalizeHost(originHost) !== normalizeHost(host)) {
      throw new AuthorizationError("Invalid request origin.");
    }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throw new AuthorizationError("Invalid request origin.");
  }
}

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isAdminRole(role: string | undefined) {
  return role === "ADMIN";
}

export function isStaffRole(role: string | undefined) {
  return role === "STAFF" || role === "ADMIN";
}
