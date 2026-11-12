import { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { issueTokenPair } from "@/lib/api/tokens";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "purple-haze-cfeb7";
const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const bodySchema = z.object({ idToken: z.string().min(20).max(8192) });

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || (await getClientIp());
    const limit = await checkRateLimit(`api:firebase-auth:${ip}`, 30, 10 * 60 * 1000);
    if (!limit.success) {
      return jsonError("RATE_LIMIT_EXCEEDED", "Too many sign-in attempts. Please try again later.", 429);
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonZodError(parsed.error);

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(parsed.data.idToken, firebaseKeys, {
        audience: firebaseProjectId,
        issuer: `https://securetoken.google.com/${firebaseProjectId}`,
        algorithms: ["RS256"],
      }));
    } catch {
      return jsonError("INVALID_TOKEN", "Firebase ID token could not be verified.", 401);
    }
    if (!payload.sub || payload.sub.length > 128) {
      return jsonError("INVALID_TOKEN", "Firebase ID token is invalid.", 401);
    }

    const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : null;
    const phone = typeof payload.phone_number === "string" ? payload.phone_number : null;
    const emailVerified = payload.email_verified === true;
    if ((!email || !emailVerified) && !phone) {
      return jsonError("UNVERIFIED_IDENTITY", "Verify your email or phone number before continuing.", 403);
    }

    // Existing business records stay keyed by the API's user ID. Firebase UIDs
    // are linked through the Account table while orders/payments remain on API.
    let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user && phone) user = await prisma.user.findFirst({ where: { phone } });

    if (user?.isBlocked) return jsonError("USER_BLOCKED", "This account is blocked.", 403);
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || `${payload.sub}@phone.purplehaze.invalid`,
          name: typeof payload.name === "string" ? payload.name.slice(0, 120) : "Customer",
          image: null,
          phone,
          emailVerified: emailVerified ? new Date() : null,
          role: "CUSTOMER",
        },
      });
    } else {
      const linked = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "firebase", providerAccountId: payload.sub } },
      });
      if (linked && linked.userId !== user.id) {
        return jsonError("IDENTITY_LINK_CONFLICT", "This Firebase account is linked to another customer.", 409);
      }
      if (!linked) {
        await prisma.account.create({
          data: { userId: user.id, type: "oauth", provider: "firebase", providerAccountId: payload.sub },
        });
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(emailVerified && !user.emailVerified ? { emailVerified: new Date() } : {}),
          ...(!user.phone && phone ? { phone } : {}),
          ...(!user.name && typeof payload.name === "string" ? { name: payload.name.slice(0, 120) } : {}),
        },
      });
    }

    const linkedAccount = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "firebase", providerAccountId: payload.sub } },
    });
    if (!linkedAccount) {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "firebase", providerAccountId: payload.sub },
      }).catch(() => undefined);
    }

    const tokens = await issueTokenPair(user);
    return jsonOk({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, image: user.image },
      tokens,
    });
  } catch (error) {
    console.error("Firebase sign-in error:", error);
    return jsonError("INTERNAL_ERROR", "Firebase sign-in could not be completed.", 500);
  }
}
