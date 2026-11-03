import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/security";
import type { AuthTokens, Role } from "@/lib/shared/types";

const ACCESS_TOKEN_EXPIRY = "15m";
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 900 seconds
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export const JWT_ISSUER = "purple-haze-api";
export const JWT_AUDIENCE = "purple-haze-mobile";

function getJwtAccessSecret(): Uint8Array {
  const secret =
    process.env.JWT_ACCESS_SECRET ||
    process.env.AUTH_SECRET ||
    "purple-haze-mobile-default-secret-key-32";
  return new TextEncoder().encode(secret);
}

export type TokenPayload = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  sessionVersion: number;
};

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtAccessSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtAccessSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }

    return {
      id: payload.sub,
      email: String(payload.email),
      role: payload.role as Role,
      name: (payload.name as string | null) ?? null,
      sessionVersion: Number(payload.sessionVersion ?? 0),
    };
  } catch {
    return null;
  }
}

export async function issueTokenPair(user: {
  id: string;
  email: string;
  role: string;
  name: string | null;
  sessionVersion: number;
}): Promise<AuthTokens> {
  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  });

  const rawRefreshToken = generateSecureToken(32);
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    tokenType: "Bearer",
  };
}

export type RotateTokenResult =
  | {
      success: true;
      tokens: AuthTokens;
      user: {
        id: string;
        email: string;
        name: string | null;
        role: Role;
      };
    }
  | {
      success: false;
      error: "REUSE_DETECTED" | "INVALID_TOKEN" | "EXPIRED_TOKEN" | "USER_BLOCKED";
      message: string;
    };

export async function rotateRefreshToken(rawRefreshToken: string): Promise<RotateTokenResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) {
    return {
      success: false,
      error: "INVALID_TOKEN",
      message: "Invalid refresh token.",
    };
  }

  // 1. Check for token reuse on already revoked token!
  if (record.isRevoked) {
    // Immediate family revocation to prevent replay attack
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return {
      success: false,
      error: "REUSE_DETECTED",
      message: "Refresh token reuse detected. All sessions in this chain have been revoked.",
    };
  }

  // 2. Check expiry
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return {
      success: false,
      error: "EXPIRED_TOKEN",
      message: "Refresh token has expired. Please sign in again.",
    };
  }

  // 3. Check if user is blocked or invalid
  const user = record.user;
  if (!user || user.isBlocked) {
    return {
      success: false,
      error: "USER_BLOCKED",
      message: "Account is blocked or unavailable.",
    };
  }

  // 4. Generate new refresh token in the same family
  const newRawRefreshToken = generateSecureToken(32);
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    // Revoke old token and point to replacement
    prisma.refreshToken.update({
      where: { id: record.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenHash: newTokenHash,
      },
    }),
    // Create new token in the same family
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        familyId: record.familyId,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  });

  return {
    success: true,
    tokens: {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: "Bearer",
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    },
  };
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawRefreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record) return false;

  await prisma.refreshToken.updateMany({
    where: { familyId: record.familyId },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  return true;
}
