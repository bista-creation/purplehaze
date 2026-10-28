"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations";
import {
  assertSameOrigin,
  generateSecureToken,
  getClientIp,
  hashToken,
} from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { SITE } from "@/lib/constants";
import { safeNextPath } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";

export type AuthActionResult = {
  success: boolean;
  message: string;
  next?: string;
  devUrl?: string;
  requiresVerification?: boolean;
};

const genericError = "Invalid email or password.";

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const next = safeNextPath(String(formData.get("next") ?? "/account"));
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: true,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? genericError,
    };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(
      `login-action:${ip}:${parsed.data.email}`,
      10,
      10 * 60 * 1000,
    );
    if (!limit.success) {
      return {
        success: false,
        message: "Too many sign-in attempts. Please try again in a few minutes.",
      };
    }

    // Check the credentials before calling Auth.js so we can explain the
    // one recoverable case (an unverified email) without leaking whether an
    // account exists to someone who does not know the password.
    const account = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        role: true,
        emailVerified: true,
        isBlocked: true,
        passwordHash: true,
      },
    });
    if (!account?.passwordHash || account.isBlocked) {
      return { success: false, message: genericError };
    }
    const validPassword = await bcrypt.compare(
      parsed.data.password,
      account.passwordHash,
    );
    if (!validPassword) {
      return { success: false, message: genericError };
    }
    if (!account.emailVerified) {
      return {
        success: false,
        message:
          "Please verify your email first. You can request a new verification link below.",
        requiresVerification: true,
      };
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    const destination =
      account.role === "ADMIN" || account.role === "STAFF"
        ? next.startsWith("/admin")
          ? next
          : "/admin"
        : next;

    return {
      success: true,
      message: "Signed in successfully.",
      next: destination,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, message: genericError };
    }
    console.error("Login failed", error);
    return { success: false, message: genericError };
  }
}

export async function registerAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "true",
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many registration attempts. Please try again later.",
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return {
        success: false,
        message:
          "An account with this email already exists. Try signing in or resetting your password.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
      },
    });

    const rawToken = generateSecureToken();
    const token = hashToken(rawToken);
    await prisma.verificationToken.deleteMany({
      where: { identifier: parsed.data.email },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: parsed.data.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${SITE.url}/verify-email?email=${encodeURIComponent(
      parsed.data.email,
    )}&token=${encodeURIComponent(rawToken)}`;
    await sendVerificationEmail(parsed.data.email, verifyUrl);
    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "user.register",
      entity: "User",
      entityId: user.id,
    });

    return {
      success: true,
      message:
        "Your account is ready. Check your inbox to confirm your email address.",
      devUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    };
  } catch (error) {
    console.error("Registration failed", error);
    return {
      success: false,
      message: "We could not create your account. Please try again.",
    };
  }
}

export async function verifyEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawToken = String(formData.get("token") ?? "");
  if (!email || !rawToken) {
    redirect("/verify-email?error=invalid");
  }

  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email,
        token: hashToken(rawToken),
      },
    },
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!record || !user || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken
        .delete({ where: { identifier_token: { identifier: email, token: hashToken(rawToken) } } })
        .catch(() => undefined);
    }
    redirect("/verify-email?error=invalid");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: email, token: hashToken(rawToken) },
      },
    }),
  ]);
  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "user.email_verified",
    entity: "User",
    entityId: user.id,
  });
  redirect("/login?verified=1");
}

export async function resendVerificationAction(
  emailInput: string,
): Promise<AuthActionResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, message: "Enter the email you registered with." };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`verify-resend:${ip}`, 3, 15 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        message: "Please wait a few minutes before requesting another link.",
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      const rawToken = generateSecureToken();
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: hashToken(rawToken),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const url = `${SITE.url}/verify-email?email=${encodeURIComponent(
        email,
      )}&token=${encodeURIComponent(rawToken)}`;
      await sendVerificationEmail(email, url);
      return {
        success: true,
        message: "If that account needs verification, a fresh link is on its way.",
        devUrl: process.env.NODE_ENV !== "production" ? url : undefined,
      };
    }

    return {
      success: true,
      message: "If that account needs verification, a fresh link is on its way.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't send the link right now. Please try again.",
    };
  }
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { success: false, message: "Enter a valid email address." };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`password-forgot:${ip}`, 4, 15 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many requests. Please try again in a few minutes.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    let devUrl: string | undefined;
    if (user) {
      const rawToken = generateSecureToken();
      await prisma.$transaction([
        // Only the newest link should remain usable. Without this, every
        // previously emailed reset link stays valid until it expires.
        prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expires: new Date(Date.now() + 60 * 60 * 1000),
          },
        }),
      ]);
      devUrl = `${SITE.url}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail(user.email, devUrl);
    }

    return {
      success: true,
      message:
        "If an account exists with that email, a password reset link is on its way.",
      devUrl: process.env.NODE_ENV !== "production" ? devUrl : undefined,
    };
  } catch (error) {
    console.error("Forgot password failed", error);
    return {
      success: true,
      message:
        "If an account exists with that email, a password reset link is on its way.",
    };
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  try {
    await assertSameOrigin();
    const tokenHash = hashToken(parsed.data.token);
    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!reset || reset.usedAt || reset.expires < new Date()) {
      return {
        success: false,
        message: "This reset link is invalid or has expired. Request a new one.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: reset.userId, id: { not: reset.id } },
      }),
    ]);

    await writeAuditLog({
      userId: reset.userId,
      actorEmail: reset.user.email,
      action: "user.password_reset",
      entity: "User",
      entityId: reset.userId,
    });

    return {
      success: true,
      message: "Your password has been reset. You can now sign in.",
      next: "/login?reset=1",
    };
  } catch (error) {
    console.error("Reset password failed", error);
    return {
      success: false,
      message: "We could not reset your password. Please try again.",
    };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function requireLoginRedirect(next: string) {
  redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
}
