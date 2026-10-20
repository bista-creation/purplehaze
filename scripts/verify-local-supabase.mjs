/**
 * Local-only RLS/Realtime checks. Refuses to run against anything except the
 * loopback Supabase PostgreSQL instance.
 *
 * Usage: npm run db:local:verify (after db:local:setup)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (
  !/^postgres(ql)?:\/\/[^@\s]+@(?:127\.0\.0\.1|localhost|\[::1\]):54322\//i.test(
    url,
  )
) {
  console.error(
    "Refusing to verify: DATABASE_URL is not the local Supabase PostgreSQL URL on port 54322.",
  );
  process.exit(1);
}

// Keep the local verifier compatible with a pooler if the Supabase stack is
// fronted by PgBouncer/Supavisor. Named prepared statements do not survive
// transaction pooling.
function prismaDatasourceUrl(raw) {
  if (!raw) return undefined;
  if (/[?&]pgbouncer=/i.test(raw)) return raw;
  const hashIndex = raw.indexOf("#");
  const base = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : raw.slice(hashIndex);
  return `${base}${base.includes("?") ? "&" : "?"}pgbouncer=true${hash}`;
}

const prisma = new PrismaClient({
  datasourceUrl: prismaDatasourceUrl(process.env.DATABASE_URL),
});
const failures = [];
let verificationNotificationId = null;

function check(condition, message) {
  if (condition) {
    console.log(`PASS  ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL  ${message}`);
  }
}

async function asRole(role, claims, work) {
  return prisma.$transaction(async (tx) => {
    if (claims) {
      // Set claims while still the migration/server role, then switch to the
      // browser role. SET LOCAL reverts both when the transaction ends.
      await tx.$queryRawUnsafe(
        "SELECT set_config('request.jwt.claims', $1, true)",
        JSON.stringify(claims),
      );
    }
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
    return work(tx);
  });
}

try {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  check(tables.length > 0, "public schema has tables");
  check(
    tables.every((table) => table.rowsecurity === true),
    "row-level security is enabled on every public table",
  );

  const publication = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
     ORDER BY tablename`,
  );
  check(
    publication.length === 1 && publication[0].tablename === "Notification",
    "Realtime publication contains only Notification",
  );

  const seededTestNotifications = await prisma.notification.count({
    where: { isTest: true },
  });
  check(
    seededTestNotifications > 0,
    "seed created test notifications for the visibility check",
  );

  // Insert one non-test notification so the staff policy is tested positively
  // rather than passing vacuously when the seed contains only test alerts.
  const verificationNotification = await prisma.notification.upsert({
    where: { eventKey: "rls-verification:non-test" },
    update: { isTest: false },
    create: {
      eventKey: "rls-verification:non-test",
      type: "SYSTEM",
      title: "RLS verification",
      message: "Temporary non-test notification created by the local verifier.",
      link: "/admin/notifications",
      isTest: false,
    },
  });
  verificationNotificationId = verificationNotification.id;

  const staffClaims = {
    sub: "rls-verification-staff",
    role: "authenticated",
    app_role: "STAFF",
  };
  const staffVisibility = await asRole(
    "authenticated",
    staffClaims,
    async (tx) => {
      const direct = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS count FROM "Notification"`,
      );
      const withTest = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS count FROM "Notification" WHERE "isTest" = true`,
      );
      return { direct: direct[0].count, testRows: withTest[0].count };
    },
  );
  check(
    staffVisibility.direct > 0,
    "staff Realtime policy can read non-test notifications",
  );
  check(
    staffVisibility.testRows === 0,
    "staff Realtime policy hides test notifications",
  );

  const customerVisibility = await asRole(
    "authenticated",
    {
      sub: "rls-verification-customer",
      role: "authenticated",
      app_role: "CUSTOMER",
    },
    async (tx) =>
      tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "Notification"`),
  );
  check(
    customerVisibility[0].count === 0,
    "customer JWT cannot read staff notifications",
  );

  // Check privileges directly rather than provoking a permission error inside
  // a transaction. A caught PostgreSQL error still aborts the transaction.
  const anonPrivileges = await prisma.$queryRawUnsafe(
    `SELECT
       has_schema_privilege('anon', 'public', 'USAGE') AS schema_usage,
       has_table_privilege('anon', 'public."Notification"', 'SELECT') AS can_select`,
  );
  check(
    anonPrivileges[0].schema_usage === false &&
      anonPrivileges[0].can_select === false,
    "anon has no schema usage or Notification read privilege",
  );

  const authenticatedPrivileges = await prisma.$queryRawUnsafe(
    `SELECT
       has_schema_privilege('authenticated', 'public', 'USAGE') AS schema_usage,
       has_table_privilege('authenticated', 'public."Notification"', 'SELECT') AS can_select,
       has_table_privilege('authenticated', 'public."Notification"', 'INSERT') AS can_insert`,
  );
  check(
    authenticatedPrivileges[0].schema_usage === true &&
      authenticatedPrivileges[0].can_select === true &&
      authenticatedPrivileges[0].can_insert === false,
    "authenticated can only read Notification, never write it",
  );

  console.log(
    `\nStaff-visible non-test notifications: ${staffVisibility.direct}. RLS checks are source-of-truth checks, not a full security audit.`,
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? `Verification failed before checks completed: ${error.message}`
      : "Verification failed before checks completed.",
  );
  process.exitCode = 1;
} finally {
  if (verificationNotificationId) {
    await prisma.notification
      .deleteMany({ where: { id: verificationNotificationId } })
      .catch(() => undefined);
  }
  await prisma.$disconnect();
}

if (failures.length > 0) {
  process.exitCode = 1;
}
