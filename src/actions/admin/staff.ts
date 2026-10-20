"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
} from "@/lib/admin";
import { staffSchema, type StaffInput } from "@/lib/validations";
import type { AdminActionResult } from "@/actions/admin/orders";

async function activeAdminCount() {
  return prisma.user.count({
    where: { role: "ADMIN", isBlocked: false },
  });
}

export async function saveStaffAction(
  input: StaffInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the staff details.",
    };
  }
  if (parsed.data.role === "CUSTOMER") {
    return {
      success: false,
      message: "Use the customers page to manage customer accounts.",
    };
  }
  try {
    const actor = await adminActionUser();
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return { success: false, message: "An account with this email already exists." };
    }

    if (id) {
      const current = await prisma.user.findUnique({ where: { id } });
      if (!current) return { success: false, message: "Staff member not found." };
      if (id === actor.id && parsed.data.role !== "ADMIN") {
        return { success: false, message: "You cannot remove your own admin access." };
      }
      if (
        current.role === "ADMIN" &&
        parsed.data.role !== "ADMIN" &&
        (await activeAdminCount()) <= 1
      ) {
        return { success: false, message: "At least one admin must remain." };
      }
      if (!parsed.data.password && !current.passwordHash) {
        return {
          success: false,
          message: "Set a password for this account so it can sign in.",
        };
      }
      const passwordHash = parsed.data.password
        ? await bcrypt.hash(parsed.data.password, 12)
        : undefined;
      await prisma.user.update({
        where: { id },
        data: {
          name: parsed.data.name,
          email,
          phone: parsed.data.phone,
          role: parsed.data.role,
          emailVerified: current.emailVerified ?? new Date(),
          ...(passwordHash
            ? { passwordHash, sessionVersion: { increment: 1 } }
            : {}),
        },
      });
      await auditAction(actor, "staff.update", "User", id, {
        email,
        role: parsed.data.role,
        passwordReset: Boolean(passwordHash),
      });
      refreshAdmin("/admin/staff", "/admin/customers");
      return { success: true, message: "Staff account updated." };
    }

    if (!parsed.data.password) {
      return { success: false, message: "Set a temporary password for the new staff member." };
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone,
        role: parsed.data.role,
        passwordHash,
        emailVerified: new Date(),
      },
    });
    await auditAction(actor, "staff.create", "User", created.id, {
      email,
      role: parsed.data.role,
    });
    refreshAdmin("/admin/staff", "/admin/customers");
    return {
      success: true,
      message: "Staff account created. Share the temporary password securely.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the staff account."),
    };
  }
}

export async function setUserBlockedAction(
  userId: string,
  blocked: boolean,
): Promise<AdminActionResult> {
  try {
    const actor = await adminActionUser();
    if (userId === actor.id) {
      return { success: false, message: "You cannot block your own account." };
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false, message: "Account not found." };
    if (
      blocked &&
      target.role === "ADMIN" &&
      !target.isBlocked &&
      (await activeAdminCount()) <= 1
    ) {
      return { success: false, message: "At least one active admin must remain." };
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: blocked,
        ...(blocked ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    await auditAction(actor, blocked ? "user.block" : "user.unblock", "User", userId, {
      email: target.email,
      role: target.role,
    });
    refreshAdmin("/admin/staff", "/admin/customers");
    return {
      success: true,
      message: blocked
        ? "Account blocked and signed out of active sessions."
        : "Account unblocked.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the account."),
    };
  }
}
