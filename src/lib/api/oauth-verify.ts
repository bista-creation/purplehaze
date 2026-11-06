import "server-only";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "@/lib/prisma";
import { issueTokenPair } from "./tokens";
import type { AuthTokens } from "@/lib/shared/types";

const appleJWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type VerifiedSocialProfile = {
  provider: "google" | "apple";
  providerAccountId: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function trustedGooglePicture(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !(host === "googleusercontent.com" || host.endsWith(".googleusercontent.com"))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedSocialProfile | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.email || data.email_verified !== "true") {
      return null;
    }

    const allowedClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      "731856766862-nd6rfig6r6862qtlujhk550knvtkm1na.apps.googleusercontent.com",
      "731856766862-b1rg511ctdf3i5ia00mlimsmr245t8ke.apps.googleusercontent.com",
    ].filter(Boolean) as string[];

    if (allowedClientIds.length > 0 && !allowedClientIds.includes(data.aud)) {
      console.warn("Google ID token audience mismatch:", data.aud);
      return null;
    }

    return {
      provider: "google",
      providerAccountId: data.sub,
      email: String(data.email).toLowerCase(),
      name: data.name ?? null,
      image: trustedGooglePicture(data.picture),
    };
  } catch (error) {
    console.error("Google ID token verification failed:", error);
    return null;
  }
}

export async function verifyAppleIdToken(idToken: string): Promise<VerifiedSocialProfile | null> {
  try {
    const { payload } = await jwtVerify(idToken, appleJWKS, {
      issuer: "https://appleid.apple.com",
    });

    if (!payload.sub || !payload.email) {
      return null;
    }

    return {
      provider: "apple",
      providerAccountId: payload.sub,
      email: String(payload.email).toLowerCase(),
    };
  } catch (error) {
    console.error("Apple ID token verification failed:", error);
    return null;
  }
}

export async function handleSocialSignIn(profile: VerifiedSocialProfile): Promise<{
  tokens: AuthTokens;
  user: { id: string; email: string; name: string | null; role: string; image: string | null };
}> {
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (user && user.isBlocked) {
    throw new Error("This account is blocked.");
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name || "Customer",
        image: profile.image || null,
        emailVerified: new Date(),
        role: "CUSTOMER",
      },
    });
  } else if (!user.emailVerified || (!user.image && profile.image)) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(!user.emailVerified ? { emailVerified: new Date() } : {}),
        ...(!user.image && profile.image ? { image: profile.image } : {}),
      },
    });
  }

  // Link account if not already linked
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    }).catch(() => undefined);
  }

  const tokens = await issueTokenPair(user);

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    },
  };
}
