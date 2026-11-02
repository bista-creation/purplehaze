-- Migration: Supabase Realtime Authorization on realtime.messages
-- Adds RLS policies to Supabase's existing realtime.messages table using realtime.topic().
-- Does NOT create tables or roles.

-- 1. Public Channel Policy: menu-availability (authenticated & anon)
DROP POLICY IF EXISTS "public_read_menu_availability" ON realtime.messages;
CREATE POLICY "public_read_menu_availability"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (
  realtime.topic() = 'menu-availability'
);

-- 2. User Private Channel Policy: user-{userId} (authenticated only, own user ID)
DROP POLICY IF EXISTS "users_read_own_channel" ON realtime.messages;
CREATE POLICY "users_read_own_channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user-' || (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))
);

-- 3. Staff Private Channel Policy: admin-orders (authenticated only, staff/admin role)
DROP POLICY IF EXISTS "staff_read_admin_orders" ON realtime.messages;
CREATE POLICY "staff_read_admin_orders"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'admin-orders'
  AND (
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role') IN ('STAFF', 'ADMIN')
    OR
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role') IN ('STAFF', 'ADMIN')
  )
);
