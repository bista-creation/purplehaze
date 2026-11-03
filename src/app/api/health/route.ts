import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbStatus = "healthy";
  let riderInfo: any = null;

  try {
    const user = await prisma.user.findUnique({
      where: { email: "rider@purplehaze.com" },
      select: { id: true, email: true, role: true, emailVerified: true, isBlocked: true, passwordHash: true },
    });
    riderInfo = user
      ? { email: user.email, role: user.role, hasHash: !!user.passwordHash, verified: !!user.emailVerified, blocked: user.isBlocked }
      : "NOT_FOUND";
  } catch (err) {
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
