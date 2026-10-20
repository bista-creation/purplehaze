/**
 * Non-destructive production admin provisioning.
 *
 * Unlike `prisma/seed.ts`, this script never deletes data. It creates the
 * configured email as an ADMIN, or updates that existing user's password and
 * restores admin access. It is for an explicit, one-off owner action:
 *
 *   ADMIN_BOOTSTRAP_CONFIRM=APPLY npm run admin:ensure
 *
 * The password is read from the environment and is never printed.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prismaDatasourceUrl } from "../src/lib/database-url";

const envFile = process.env.ADMIN_BOOTSTRAP_ENV_FILE?.trim();
config(envFile ? { path: envFile, override: true } : {});

function fail(message: string): never {
  console.error(`Admin provisioning stopped: ${message}`);
  process.exit(1);
}

async function main() {
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== "APPLY") {
    fail(
      "set ADMIN_BOOTSTRAP_CONFIRM=APPLY to confirm this one-off database write.",
    );
  }
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set.");
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Purple Haze Admin";
  const phone = process.env.SEED_ADMIN_PHONE?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail("SEED_ADMIN_EMAIL must be a valid email address.");
  }
  if (
    !password ||
    password.length < 8 ||
    password.length > 72 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    fail(
      "SEED_ADMIN_PASSWORD must be 8-72 characters and include a letter and a number.",
    );
  }

  const prisma = new PrismaClient({
    datasourceUrl: prismaDatasourceUrl(),
  });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      const user = await tx.user.upsert({
        where: { email },
        create: {
          name,
          email,
          phone,
          passwordHash,
          emailVerified: now,
          role: "ADMIN",
          isBlocked: false,
          isTest: false,
        },
        update: {
          passwordHash,
          emailVerified: now,
          role: "ADMIN",
          isBlocked: false,
          isTest: false,
          sessionVersion: { increment: 1 },
          ...(process.env.SEED_ADMIN_NAME ? { name } : {}),
          ...(process.env.SEED_ADMIN_PHONE ? { phone } : {}),
        },
        select: { id: true, email: true, role: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorEmail: user.email,
          action: existing
            ? "admin.provision.update"
            : "admin.provision.create",
          entity: "User",
          entityId: user.id,
          details: JSON.stringify({
            source: "admin:ensure",
            previousRole: existing?.role ?? null,
          }),
          ip: "local-script",
        },
      });

      return { user, existing };
    });

    if (result.existing && result.existing.role !== "ADMIN") {
      console.warn(
        `Existing ${result.existing.role.toLowerCase()} account promoted to ADMIN.`,
      );
    }
    console.log(
      `${result.existing ? "Updated" : "Created"} ${result.user.role} account: ${result.user.email}`,
    );
    console.log("Existing sessions were invalidated. Sign in at /login.");
    console.log(
      "Remove the admin password from environment variables after setup and store it in a password manager.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Admin provisioning failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
