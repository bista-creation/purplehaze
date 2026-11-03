import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  let dbStatus = "healthy";
  let riderInfo: any = null;
  let seedResult: any = null;

  if (req.nextUrl.searchParams.get("seed") === "rider") {
    try {
      const hash = await bcrypt.hash("Password123!", 12);
      const user = await prisma.user.upsert({
        where: { email: "rider@purplehaze.com" },
        update: {
          role: "RIDER",
          passwordHash: hash,
          emailVerified: new Date(),
          isBlocked: false,
        },
        create: {
          name: "Test Rider",
          email: "rider@purplehaze.com",
          phone: "+9779800000000",
          role: "RIDER",
          passwordHash: hash,
          emailVerified: new Date(),
          isBlocked: false,
        },
      });

      const profile = await (prisma as any).riderProfile.upsert({
        where: { userId: user.id },
        update: {
          shiftStatus: "ON_DUTY",
          licenseStatus: "VERIFIED",
        },
        create: {
          userId: user.id,
          shiftStatus: "ON_DUTY",
          licenseStatus: "VERIFIED",
          vehicleType: "BIKE",
          encryptedPlateNumber: "BA-99-PA-1234",
          encryptedLicenseNo: "DL-TEST-9999",
        },
      });

      seedResult = { success: true, userId: user.id, profileId: profile.id };
    } catch (err: any) {
      seedResult = { success: false, error: err.message };
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: "rider@purplehaze.com" },
      select: { id: true, email: true, role: true, emailVerified: true, isBlocked: true, passwordHash: true },
    });
    const dbTarget = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@") : "NONE";
    let tableCounts: any = {};
    try {
      tableCounts.users = await prisma.user.count();
      tableCounts.orders = await prisma.order.count();
      tableCounts.refreshTokens = await (prisma as any).refreshToken.count();
      tableCounts.sampleUsers = await prisma.user.findMany({ take: 3, select: { email: true, role: true } });
    } catch (e: any) {
      tableCounts.error = e.message;
    }
    riderInfo = user
      ? { email: user.email, role: user.role, hasHash: !!user.passwordHash, verified: !!user.emailVerified, blocked: user.isBlocked, dbTarget, tableCounts, seedResult }
      : { status: "NOT_FOUND", dbTarget, tableCounts, seedResult };
  } catch (err: any) {
    dbStatus = "unreachable";
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        database: dbStatus,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Database check failed",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      rider: riderInfo,
      latencyMs: Date.now() - start,
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
