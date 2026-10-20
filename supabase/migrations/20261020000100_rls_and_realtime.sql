-- Purple Haze: browser access policy and Realtime publication.
--
-- The Next.js server talks to PostgreSQL through Prisma using the postgres
-- connection. Browsers never receive a database connection; the only browser
-- database feature is Supabase Realtime for staff notification inserts.
--
-- Therefore:
--   1. RLS is enabled on every public table (default deny).
--   2. anon/authenticated lose all table and sequence privileges.
--   3. authenticated receives SELECT on Notification only.
--   4. The policy requires a short-lived Auth.js-signed staff JWT and hides
--      test notifications.
--   5. Writes remain server-only through Prisma.

DO $$
DECLARE
  table_row record;
BEGIN
  FOR table_row IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_row.tablename
    );
  END LOOP;
END
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public."Notification" TO authenticated;

-- Keep the same default-deny posture for tables added later by these roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

DROP POLICY IF EXISTS "staff_read_staff_notifications" ON public."Notification";
CREATE POLICY "staff_read_staff_notifications"
ON public."Notification"
FOR SELECT
TO authenticated
USING (
  "isTest" = false
  AND COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role',
    ''
  ) IN ('STAFF', 'ADMIN')
  AND (
    "userId" IS NULL
    OR "userId" = COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
      ''
    )
  )
);

-- Realtime Postgres Changes needs the table in the publication. Keep this
-- limited to Notification: order and payment rows are not broadcast.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'Notification'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Notification";
  END IF;
END
$$;
