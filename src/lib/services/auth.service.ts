import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/security";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { SITE } from "@/lib/constants";
import type { AddressInput, ProfileInput, RegisterInput } from "@/lib/validations";
import type { Role } from "@/lib/constants";

export class AuthService {
  async registerUser(input: RegisterInput, options?: { autoVerify?: boolean }) {
    const emailLower = input.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
      select: { id: true, emailVerified: true },
    });

    if (existing) {
      if (!existing.emailVerified && !options?.autoVerify) {
        const rawToken = generateSecureToken(32);
        const tokenHash = hashToken(rawToken);
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.verificationToken.upsert({
          where: { identifier_token: { identifier: emailLower, token: tokenHash } },
          update: { expires },
          create: { identifier: emailLower, token: tokenHash, expires },
        });

        const verifyUrl = `${SITE.url}/verify-email?email=${encodeURIComponent(
          emailLower,
        )}&token=${encodeURIComponent(rawToken)}`;
        await sendVerificationEmail(emailLower, verifyUrl).catch(() => undefined);

        return {
          success: true,
          userId: existing.id,
          requiresVerification: true,
          message: "Please check your inbox to verify your email address.",
          devUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
        };
      }

      return {
        success: false,
        message: "An account with this email already exists. Please sign in.",
      };
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: emailLower,
        phone: input.phone?.trim() ? input.phone.trim() : null,
        passwordHash,
        role: "CUSTOMER",
        emailVerified: options?.autoVerify ? new Date() : null,
      },
    });

    let verifyUrl: string | undefined;
    if (!options?.autoVerify) {
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          identifier: emailLower,
          token: tokenHash,
          expires,
        },
      });

      verifyUrl = `${SITE.url}/verify-email?email=${encodeURIComponent(
        emailLower,
      )}&token=${encodeURIComponent(rawToken)}`;
      await sendVerificationEmail(emailLower, verifyUrl).catch(() => undefined);
    }

    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "user.register",
      entity: "User",
      entityId: user.id,
    });

    return {
      success: true,
      userId: user.id,
      requiresVerification: !options?.autoVerify,
      message: options?.autoVerify
        ? "Account created successfully."
        : "Account created! Please check your email to verify your address.",
      devUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    };
  }

  async verifyCredentials(email: string, passwordPlain: string) {
    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user || !user.passwordHash || user.isBlocked) {
      return { success: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." } as const;
    }

    const valid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!valid) {
      return { success: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." } as const;
    }

    if (!user.emailVerified) {
      return {
        success: false,
        code: "UNVERIFIED_EMAIL",
        message: "Please verify your email address first.",
        user,
      } as const;
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as Role,
        image: user.image,
        sessionVersion: user.sessionVersion,
      },
    } as const;
  }

  async requestPasswordReset(email: string) {
    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      select: { id: true, name: true, email: true, isBlocked: true },
    });

    if (!user || user.isBlocked) {
      // Don't leak user existence
      return { success: true };
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expires,
      },
    });

    const resetUrl = `${SITE.url}/reset-password?email=${encodeURIComponent(
      user.email,
    )}&token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail(user.email, resetUrl).catch(() => undefined);

    return { success: true, devUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined };
  }

  async resetPassword(token: string, newPasswordPlain: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expires < new Date() || record.user.isBlocked) {
      return { success: false, message: "This password reset link is invalid or has expired." };
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          emailVerified: record.user.emailVerified ?? new Date(),
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await writeAuditLog({
      userId: record.userId,
      actorEmail: record.user.email,
      action: "user.password_reset",
      entity: "User",
      entityId: record.userId,
    });

    return { success: true, message: "Your password has been reset. Please sign in." };
  }

  async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return {
        success: false,
        message: "This account uses social sign-in. Use password reset to create a password.",
      };
    }

    const valid = await bcrypt.compare(currentPasswordPlain, user.passwordHash);
    if (!valid) {
      return { success: false, message: "Your current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });

    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "user.password_change",
      entity: "User",
      entityId: user.id,
    });

    return { success: true, message: "Your password has been changed." };
  }

  async getUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        riderProfile: {
          select: {
            id: true,
            shiftStatus: true,
            licenseStatus: true,
            mustChangePassword: true,
          },
        },
      },
    });
  }

  async updateUserProfile(userId: string, input: ProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
        image: input.image || null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "user.profile_update",
      entity: "User",
      entityId: user.id,
    });

    return user;
  }

  async getUserAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async saveAddress(userId: string, input: AddressInput, addressId?: string) {
    const existingCount = await prisma.address.count({ where: { userId } });
    const makeDefault = input.isDefault || existingCount === 0;

    if (addressId) {
      const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!existing) throw new Error("Address not found.");
    }

    return prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const data = {
        userId,
        label: input.label.trim(),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        line1: input.line1.trim(),
        line2: input.line2?.trim() || null,
        city: input.city.trim(),
        state: input.state.trim(),
        postalCode: input.postalCode?.trim() || null,
        country: input.country?.trim() || "Nepal",
        isDefault: makeDefault,
      };

      if (addressId) {
        return tx.address.update({ where: { id: addressId }, data });
      }
      return tx.address.create({ data });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new Error("Address not found.");

    await prisma.address.delete({ where: { id: address.id } });

    if (address.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new Error("Address not found.");

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: address.id },
        data: { isDefault: true },
      }),
    ]);
  }

  async getUserFavorites(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        dish: {
          include: {
            category: { select: { name: true, slug: true } },
            variants: { where: { isAvailable: true } },
            addOns: { include: { addOn: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((f) => f.dish);
  }

  async toggleFavorite(userId: string, dishId: string) {
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, name: true },
    });
    if (!dish) throw new Error("Dish not found.");

    const existing = await prisma.favorite.findUnique({
      where: { userId_dishId: { userId, dishId } },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_dishId: { userId, dishId } },
      });
      return { favorited: false, dishName: dish.name };
    }

    await prisma.favorite.create({ data: { userId, dishId } });
    return { favorited: true, dishName: dish.name };
  }
}

export const authService = new AuthService();
