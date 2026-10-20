# Purple Haze Restro & Garden

Next.js App Router site and ordering platform for Purple Haze in Biratnagar. It includes the public menu/site, checkout, reservations and event enquiries, customer accounts, receipts and kitchen tickets, and a role-protected admin workspace.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion
- Prisma with PostgreSQL (local Supabase PostgreSQL, hosted PostgreSQL in deployment)
- Auth.js JWT sessions with database role/block/session checks
- Supabase Realtime for staff new-order alerts, with polling fallback
- NPR integer paisa, UTC storage, `Asia/Kathmandu` display

## Local development with Supabase

### Prerequisites

- Node.js and npm (use the existing `package-lock.json`)
- Docker Desktop with the WSL 2 backend running
- Supabase CLI (invoked through `npx supabase`; currently `2.121.0`)

Docker Desktop on Windows must be running before `npm run db:local:start`. If Docker is not available, the application code can still be linted and type-checked, but the production build, local database, RLS checks, and database-backed smoke tests cannot complete. Keep `.env` saved as UTF-8 without a BOM; the Supabase CLI rejects byte-order marks on Windows.

### First-time setup

1. Copy `.env.example` to `.env` and fill in local, non-secret values. The template points at the local Supabase PostgreSQL port `54322`. Do **not** point local development at a hosted database.
2. Set `AUTH_SECRET` and a local `SEED_ADMIN_PASSWORD`. The seed admin email should remain a private testing mailbox and must not be used in the public UI.
3. Start Docker Desktop.
4. Run:

```bash
npm install
npm run db:local:start
npm run db:local:reset
npm run db:local:env
npm run db:seed
npm run db:local:verify
```

Or run `npm run db:local:setup`, which chains the database steps. `db:local:env` reads `supabase status -o env`, writes the local database URL, anon key, API URL, and JWT secret to the untracked `.env.local`, and never reads or writes the service-role key. `db:local:verify` temporarily inserts one non-test notification to prove staff Realtime visibility, then deletes it in a `finally` block.

Then:

```bash
npm run dev
```

Open <http://localhost:3000>. The admin is at `/admin`.

### Database migrations

`supabase/migrations/20261020000000_initial_schema.sql` is the baseline schema generated from `prisma/schema.prisma`. `supabase/migrations/20261020000100_rls_and_realtime.sql` enables default-deny RLS, removes browser table/sequence privileges, grants staff-only `SELECT` on `Notification`, and adds only `Notification` to the Realtime publication.

The Supabase migration directory is the source of truth for the database. The Prisma schema is the application/client source of truth. Do not run both `supabase db reset` and a separate Prisma baseline migration against the same fresh database.

Prisma Client automatically appends `pgbouncer=true` to its runtime datasource URL. Supabase transaction pooling/PgBouncer does not support Prisma's named prepared statements, and without this flag concurrent builds or serverless requests can fail with `prepared statement "s7" does not exist`. The setting is harmless on a direct connection. `DIRECT_URL` remains unmodified and is used for migrations.

For an existing hosted/production database, do not apply this baseline blindly. A reviewed baseline strategy and backup are required before any migration. No hosted Supabase project, production database, or production data was modified while building this local setup.

### Test data and seeding

The TypeScript seed runs only against loopback Supabase PostgreSQL on `127.0.0.1:54322`. It refuses every other database with no override.

Seeded orders use `isTest = true` and the `PH-SEED-` prefix. Test records are excluded from:

- dashboard order/revenue/customer metrics
- reports and all CSV exports
- unread badges and the default notification inbox
- order and customer lists by default

Outside production, admins can deliberately reveal test orders, customers, and alerts with the “Show test…” controls. Those controls are not rendered when `NODE_ENV=production`, and a manually supplied `?test=1` is ignored there. The CSV export still excludes test data even while the local UI toggle is on.

Do not import `prisma/dev.db` or real customer/order data into local development. The old SQLite file is left untouched and is not used by the current PostgreSQL schema.

### Create or reset a production admin

Adding `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to Vercel does **not** create or change a user by itself. Those variables only feed the scripts. Never run the destructive demo seed (`npm run db:seed`) against production.

Use the non-destructive provisioning script instead. It creates the configured email as an admin, or updates that existing account's password and restores access. It never deletes data, invalidates existing sessions, and never prints the password. It requires an explicit confirmation value.

With a locally loaded production environment (after `vercel login` and `vercel link`):

```powershell
npx vercel env pull .env.production.local --environment=production
$env:ADMIN_BOOTSTRAP_ENV_FILE = ".env.production.local"
$env:ADMIN_BOOTSTRAP_CONFIRM = "APPLY"
npm run admin:ensure
Remove-Item Env:ADMIN_BOOTSTRAP_ENV_FILE, Env:ADMIN_BOOTSTRAP_CONFIRM
```

`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, and `SEED_ADMIN_PHONE` must be present in that environment file. If your host marks secrets as sensitive and does not export them, set `DATABASE_URL`, `DIRECT_URL`, and those four values explicitly for the one command. Remove `.env.production.local` afterwards, and rotate/remove the bootstrap password once the account works.

## Order acceptance and payment policy

Payment status is separate from fulfilment status.

- Online orders may only be accepted after the trusted provider callback/lookup verifies the payment and marks it `PAID`.
- COD orders may be accepted while unpaid. The UI labels them `Cash due` / collect-on-delivery. Staff record cash only after collection; online orders cannot be marked paid manually.
- Pending paid online orders can be declined; the payment stays `PAID` and the order is flagged `Refund required`. Refunds are never automatic. An admin records the refund only after it is completed in eSewa/Khalti or at the counter (admin-only action).
- Acceptance requires a confirmation that shows the order number, service type, delivery/pickup details, total, and payment state. The action is idempotent, uses conditional updates to reject stale changes, writes status history and audit records, and emits at most one notification event.
- Customer status emails are sent only after a successful state change, not on duplicate or failed updates.

## Staff notifications and Realtime

- `/admin/notifications` is the full inbox with unread/all/type filters, per-user acknowledge/unread actions, mark-all-read, pagination, order links, and local-only test-alert visibility.
- The dashboard shows only the latest five unread items; the inbox is explicitly labelled as the full history.
- Browser/system alerts use only a safe order reference or event category and a generic “Open the admin inbox” body; customer names, addresses, notes, totals and payment details stay in the app.
- Connection state is shown as connecting, live, polling fallback, or offline. If Realtime is unavailable, the app polls. The monitor shows the last successful check time and provides a manual refresh.
- The Realtime JWT is short-lived, signed server-side, and issued only after an Auth.js staff/admin check. RLS requires a valid staff `app_role` claim. New-order notification rows are saved in the same database transaction as the order before any event can be emitted.
- If an event is missed, the polling refresh or a manual refresh reloads the authoritative database state. Test notifications are not broadcast to staff browsers.
- Loading skeletons, route-level error boundaries (root, public site, and admin), and a branded 404 are included so slow or failed pages have an explicit state instead of a blank screen.

## Payments (eSewa and Khalti)

Payment behaviour is controlled by `PAYMENT_MODE`:

- `mock` – online methods are shown, but the order page simulates a successful payment. No provider network calls.
- `sandbox` – real provider test environments. Use sandbox merchant credentials and sandbox hosts.
- `live` – real money. Use live merchant keys and production base URLs.

When `NODE_ENV=production`, `mock` and `sandbox` are disabled automatically. The only exception is an explicit `ALLOW_TEST_PAYMENTS=true` on a non-production preview; never set it on the production deployment. Sandbox providers, checkout options, payment initiation, and the mock-payment action all fail closed.

Both gateways are verified server-side before an order is marked paid: the eSewa callback signature is rebuilt from `signed_field_names` and checked with HMAC-SHA256, then the transaction is confirmed against the status API; Khalti payments are confirmed with the ePayment lookup API. Amount, product/merchant code, order reference, and provider reference are compared against the stored order.

Test wallet credentials, when using sandbox mode:

- eSewa: ID `9806800001`–`9806800005`, password `Nepal@123`, OTP `123456`
- Khalti: ID `9800000000`–`9800000005`, MPIN `1111`, OTP `987654`

These are test credentials only. Replace all sandbox keys and hosts before switching to `live`.

### Going live

- Set `PAYMENT_MODE=live`.
- Replace `ESEWA_*` with live merchant values and point `ESEWA_BASE_URL` at the live eSewa form host.
- Replace `KHALTI_SECRET_KEY` with the production key and set the live Khalti base URL.
- The app refuses to start a gateway when the configured base URL points at a different environment than `PAYMENT_MODE`.
- Configure a verified email sending domain; Resend cannot deliver production mail from `onboarding@resend.dev`.
- Connect a Vercel Blob store to the project for production image uploads. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically; redeploy after connecting it. UploadThing is still supported, and local disk uploads remain available only where the host has a persistent filesystem.

### Google sign-in

Google sign-in is optional and only appears when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present at runtime. To enable it on Vercel:

1. In Google Cloud Console, add the production JavaScript origin: `https://purplehaze-nine.vercel.app`.
2. Add the authorized redirect URI exactly as `https://purplehaze-nine.vercel.app/api/auth/callback/google`. Use one slash before `api`; a URL such as `https://purplehaze-nine.vercel.app//api/auth/callback/google` will fail with `redirect_uri_mismatch`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_URL=https://purplehaze-nine.vercel.app`, and `NEXT_PUBLIC_APP_URL=https://purplehaze-nine.vercel.app` in Vercel. Do not include a trailing slash in either URL.
4. Redeploy. `https://purplehaze-nine.vercel.app/api/auth/providers` must list `google`; until it does, the buttons stay hidden by design.

The app normalizes trailing and duplicate path slashes in `AUTH_URL` and derives `NEXT_PUBLIC_APP_URL` from the Vercel deployment host when it is unset. A `localhost` value is ignored on Vercel so production never emits local links. The value registered in Google Cloud Console must still use the exact single-slash callback above.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` requires a reachable database for pages that query it. Run it after local Supabase is started and seeded, or against a reviewed staging database. Do not run destructive commands against production.

## Environment and secrets

- Never commit `.env`, `.env.local`, service-role keys, provider secrets, or customer data.
- Browser code receives only the local/remote anon key and a short-lived staff Realtime JWT. Service-role keys are never exposed to clients.
- Keep local, preview, and production environments separate. Hosted Supabase changes require explicit approval.
- The public contact address is `purplehaze_biratnagar@gmail.com`. The private testing mailbox belongs only in untracked local configuration and admin notification environment variables.

## Remaining production configuration

The following are intentionally not fabricated in this repository and must be supplied by the owner/operator:

- verified email sending domain and production Resend credentials
- a connected Vercel Blob store (or UploadThing project credentials) for production image uploads
- Upstash Redis credentials for distributed rate limiting
- live eSewa/Khalti merchant credentials and approved refund procedure
- Google OAuth client credentials and the exact single-slash redirect URI (see above)
- explicit production `AUTH_URL` and `NEXT_PUBLIC_APP_URL` values on Vercel
- official menu, prices, venue capacities/packages, and owner-authorized photography
- hosted PostgreSQL backup/migration plan and a reviewed baseline strategy

See `SECURITY_AUDIT.md` for the source-review findings. It is not a complete security audit or a penetration test.
