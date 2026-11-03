import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `CREATE SCHEMA IF NOT EXISTS realtime;`,
  
  `CREATE TABLE IF NOT EXISTS realtime.messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic TEXT NOT NULL,
      extension TEXT NOT NULL,
      payload JSONB,
      event TEXT,
      private BOOLEAN DEFAULT false,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon WITH NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated WITH NOLOGIN NOBYPASSRLS;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
      GRANT authenticated TO neondb_owner;
      GRANT anon TO neondb_owner;
    END IF;
  END $$;`,
  
  `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE realtime.messages FORCE ROW LEVEL SECURITY;`,

  `GRANT USAGE ON SCHEMA realtime TO anon, authenticated;`,
  `GRANT SELECT ON realtime.messages TO anon, authenticated;`,
  
  `DROP POLICY IF EXISTS "public_read_menu_availability" ON realtime.messages;`,
  
  `CREATE POLICY "public_read_menu_availability"
  ON realtime.messages
  FOR SELECT
  TO authenticated, anon
  USING (
    topic = 'menu-availability'
  );`,
  
  `DROP POLICY IF EXISTS "users_read_own_channel" ON realtime.messages;`,
  
  `CREATE POLICY "users_read_own_channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    topic = ('user-' || COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
      ''
    ))
  );`,
  
  `DROP POLICY IF EXISTS "staff_read_admin_orders" ON realtime.messages;`,
  
  `CREATE POLICY "staff_read_admin_orders"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    topic = 'admin-orders'
    AND (
      COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role', '') IN ('STAFF', 'ADMIN')
      OR
      COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role', '') IN ('STAFF', 'ADMIN')
      OR
      COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') IN ('STAFF', 'ADMIN', 'service_role')
    )
  );`
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("Applying realtime authorization migration to DB...");
  if (!dbUrl.includes("ep-autumn-grass-b55zj482")) {
    console.error("Safety guard: Refusing to run on unexpected DB host!");
    process.exit(1);
  }

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log("Realtime authorization migration applied successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
