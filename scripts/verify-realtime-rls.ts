import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Verifying Realtime Authorization RLS policies on realtime.messages...");

  const userAId = "user-a-12345";
  const userBId = "user-b-67890";

  // Clean and insert test rows
  await prisma.$executeRawUnsafe(`
    DELETE FROM realtime.messages WHERE topic IN ('user-${userAId}', 'user-${userBId}', 'admin-orders', 'menu-availability');
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO realtime.messages (id, topic, extension, payload)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'user-${userAId}', 'broadcast', '{"test": 1}'),
      ('00000000-0000-0000-0000-000000000002', 'user-${userBId}', 'broadcast', '{"test": 2}'),
      ('00000000-0000-0000-0000-000000000003', 'admin-orders', 'broadcast', '{"test": 3}'),
      ('00000000-0000-0000-0000-000000000004', 'menu-availability', 'broadcast', '{"test": 4}');
  `);

  try {
    // 1. User B query under RLS as role 'authenticated':
    const userBClaims = {
      sub: userBId,
      role: "authenticated",
      app_role: "CUSTOMER",
    };

    const userBResults = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        "SELECT set_config('request.jwt.claims', $1, true)",
        JSON.stringify(userBClaims),
      );
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");

      const canReadA = await tx.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'user-${userAId}'`
      );

      const canReadAdmin = await tx.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'admin-orders'`
      );

      const canReadOwn = await tx.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'user-${userBId}'`
      );

      const canReadMenu = await tx.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'menu-availability'`
      );

      return {
        canReadA: countOf(canReadA),
        canReadAdmin: countOf(canReadAdmin),
        canReadOwn: countOf(canReadOwn),
        canReadMenu: countOf(canReadMenu),
      };
    });

    console.log("User B Results under Postgres RLS:", userBResults);

    // 2. Staff query under RLS as role 'authenticated':
    const staffClaims = {
      sub: "staff-999",
      role: "authenticated",
      app_role: "STAFF",
    };

    const staffResults = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        "SELECT set_config('request.jwt.claims', $1, true)",
        JSON.stringify(staffClaims),
      );
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");

      const canReadAdmin = await tx.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'admin-orders'`
      );

      return {
        canReadAdmin: countOf(canReadAdmin),
      };
    });

    console.log("Staff Results under Postgres RLS:", staffResults);

    // Assertions
    if (userBResults.canReadA !== 0) throw new Error("FAIL: User B was able to read User A channel!");
    if (userBResults.canReadAdmin !== 0) throw new Error("FAIL: User B was able to read admin-orders!");
    if (userBResults.canReadOwn !== 1) throw new Error("FAIL: User B could not read own channel!");
    if (userBResults.canReadMenu !== 1) throw new Error("FAIL: User B could not read menu-availability!");
    if (staffResults.canReadAdmin !== 1) throw new Error("FAIL: Staff could not read admin-orders!");

    console.log(">>> SUCCESS: Postgres Realtime RLS authorization verified successfully!");
  } finally {
    await prisma.$executeRawUnsafe(`
      DELETE FROM realtime.messages WHERE topic IN ('user-${userAId}', 'user-${userBId}', 'admin-orders', 'menu-availability');
    `);
  }
}

function countOf(res: Array<{ count: number }>): number {
  if (!res || res.length === 0) return 0;
  return Number(res[0].count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
