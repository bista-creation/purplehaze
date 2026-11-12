import { PrismaClient } from "@prisma/client";
import { prismaDatasourceUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: prismaDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always retain client across invocations in serverless container lifecycle
globalForPrisma.prisma = prisma;
