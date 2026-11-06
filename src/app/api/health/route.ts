import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbStatus = "healthy";

  let dbInfo: any = null;
  try {
    const res = await prisma.$queryRaw<any[]>`SELECT current_database() as db, current_user as usr, inet_server_addr()::text as addr`;
    dbInfo = res[0] ?? null;
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
      dbInfo,
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
