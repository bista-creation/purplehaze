-- Migration: Supabase Realtime Authorization on realtime.messages
-- Enforces Postgres Row Level Security (RLS) on private channels.

CREATE SCHEMA IF NOT EXISTS realtime;

CREATE TABLE IF NOT EXISTS realtime.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    extension TEXT NOT NULL,
    payload JSONB,
    event TEXT,
    private BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure standard Supabase roles exist without bypassrls
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon WITH NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated WITH NOLOGIN NOBYPASSRLS;
  END IF;
  -- Allow current owner to switch to authenticated/anon during transactions
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
    GRANT authenticated TO neondb_owner;
    GRANT anon TO neondb_owner;
  END IF;
END $$;

-- Enable & Force RLS
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime.messages FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON realtime.messages TO anon, authenticated;

-- 1. Public Channel Policy: menu-availability
DROP POLICY IF EXISTS "public_read_menu_availability" ON realtime.messages;
CREATE POLICY "public_read_menu_availability"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (
  topic = 'menu-availability'
);

-- 2. User Private Channel Policy: user-{userId}
DROP POLICY IF EXISTS "users_read_own_channel" ON realtime.messages;
CREATE POLICY "users_read_own_channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic = ('user-' || COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  ))
);

-- 3. Staff Private Channel Policy: admin-orders
DROP POLICY IF EXISTS "staff_read_admin_orders" ON realtime.messages;
CREATE POLICY "staff_read_admin_orders"
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
);
