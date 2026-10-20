# Security Review — Purple Haze Restro & Garden

**Date:** 20 October 2026  
**Scope:** Next.js App Router application, authentication/session handling, role-based access control, ordering and payment flows, uploads, exports, PWA caching, HTTP headers, seed/deployment configuration, and dependencies.  
**Method:** Source review, targeted searches for dangerous patterns, route/action authorization audit, and `npm audit`. This was not a live penetration test; no production credentials or production environment were used.

## Executive summary

The application has a strong security baseline. I found no evidence of SQL injection, command injection, unsafe deserialization, or a server-side payment-forgery flaw. Authorization is consistently enforced across admin pages, admin actions, export routes, print routes, and uploads. Payment callbacks verify provider signatures/lookups plus amount, order reference, and provider reference.

However, there are **four high-priority issues** that should be fixed before a public launch. Most are deployment/configuration or client-cache problems rather than exploitable server-side code flaws:

1. A production deployment using `PAYMENT_MODE=sandbox` (the current local value) can record sandbox payments as paid, and explicit `mock` mode allows free orders.
2. The seed script is destructive and creates a staff account with a fixed, known password. It has no production guard and logs the password.
3. The service worker caches order, receipt, password-reset, and email-verification pages, including bearer tokens and customer PII, after logout.
4. The local SQLite database containing users, password hashes, orders, and audit data is not excluded by `.gitignore`.

`npm audit` reports **20 advisories** overall (2 critical, 15 high, 3 moderate). A production-only audit reports **7 high** advisories, mainly UploadThing/`effect` and Prisma/`deepmerge-ts`. The two critical advisories are in `vitest`/`tinypool` and are development-only. `next@16.4.2` itself is not flagged.

**Recommendation:** do not deploy publicly until H1–H4 below are resolved. The remaining items are important hardening and should follow in the first hardening sprint.

## Remediation status (20 October 2026)

The first hardening pass is implemented:

- **H1 fixed** — mock/sandbox payments are disabled whenever `NODE_ENV=production` unless `ALLOW_TEST_PAYMENTS=true` is explicitly set for a preview. Sandbox provider configs, checkout availability, payment initiation, and the mock-payment action all fail closed. Existing pending orders show an “online payment unavailable” state instead of a broken payment button.
- **H2 fixed** — the seed refuses every non-local database with no override. It accepts local SQLite or loopback Supabase PostgreSQL on `127.0.0.1:54322` only. Demo staff/customer accounts are blocked and receive a random password outside local development, and demo passwords are not logged in that case.
- **H3 fixed** — the service worker now caches an allowlist of public marketing pages only. Order, print, tracking, reset/verification, account, checkout, and auth pages are excluded; responses with `no-store`, `private`, or `Set-Cookie` are never cached. The cache version was bumped so old caches are purged on activation, and sign-out paths clear cached pages.
- **H4 fixed** — `prisma/*.db*` and `public/images/uploads/` are ignored by Git.
- **M1 fixed** — `safeNextPath` now rejects backslashes, encoded separators/control characters, and non-origin URLs using URL parsing.
- **M2 fixed** — CSV cells beginning with spreadsheet formula prefixes are neutralised with a leading apostrophe; numeric values are left intact.

## Local Supabase, RLS and order-hardening pass (20 October 2026)

- **Local database:** development now targets local Supabase PostgreSQL. `prisma/schema.prisma` uses PostgreSQL with `directUrl`; `supabase/migrations/` contains the baseline schema and a default-deny RLS/Realtime migration. No hosted Supabase or production database was touched. The old `prisma/dev.db` was not deleted or imported.
- **RLS:** every public table has RLS enabled. `anon` and `authenticated` lose table/sequence privileges. `authenticated` can only `SELECT` non-test `Notification` rows when the server-signed short-lived JWT contains a staff/admin `app_role`; writes remain server-only through Prisma. Only `Notification` is in the Realtime publication. Local `scripts/verify-local-supabase.mjs` checks these controls; it has not yet been run because Docker Desktop is unavailable on this machine.
- **Order acceptance:** online orders cannot be accepted until the trusted provider path marks payment `PAID`. COD orders can be accepted unpaid and are explicitly labelled collect-on-delivery. Manual “mark paid” is COD-only. Declines are separate, confirmed actions with audit records; a paid declined order stays `PAID` and is flagged `Refund required`. Only an admin can record the refund after completing it manually.
- **Idempotency and concurrency:** order creation uses a client idempotency key, status/payment transitions use conditional updates and transactions, and notification event keys deduplicate retries. Notifications are written in the same transaction as the order/status change where applicable.
- **Notifications:** `/admin/notifications` provides per-user read state, unread counts, mark-all-read, filters, order links, and deliberate test-data visibility. Browser/desktop notification bodies are limited to a safe title and a generic inbox call-to-action; customer PII stays in the app. Realtime has polling fallback, connection state, last-check time, manual refresh, optional sound, and explicit desktop-permission handling.
- **Test data:** `Order.isTest`, `Notification.isTest`, `User.isTest`, and the `PH-SEED-` prefix identify seeded records. They are excluded by default from metrics, reports, CSV, lists, unread badges, and Realtime notifications; admin toggles can reveal them deliberately.
- **Residual risk:** these are source and local-policy changes, not a full security audit. RLS has not been executed against a running local stack in this environment. A production baseline migration, MFA, CSP, dependency upgrades, and a verified email/upload provider configuration remain outstanding.

**Verification (20 October 2026):** `npm run lint` and `npm run typecheck` pass; `npm test` passes 37 tests. `npm run build` compiled and passed TypeScript, then failed during static prerender because local Supabase PostgreSQL at `127.0.0.1:54322` is not running (Docker Desktop is not installed). The RLS verification script has not run. This is not a complete security audit.

M3–M7 remain open and should be handled before or immediately after launch. H2 still uses the destructive seed for initial local/demo data; a separate production bootstrap script is still recommended.

## Findings

### H1 — Sandbox/mock payments can be treated as real payments in production

**Severity:** High (Critical if sandbox mode is deployed publicly)  
**Evidence:** `src/lib/payments.ts:11-18`, `src/actions/orders.ts:861-867`, `.env` (`PAYMENT_MODE=sandbox`), README sandbox wallet instructions.

`getPaymentMode()` defaults to `mock` and accepts `sandbox` in every environment. Sandbox eSewa/Khalti transactions are verified against the sandbox APIs and then mark the order `PAID`. If the local `.env` is copied to production, anyone can use the publicly documented test wallets to place orders that the restaurant will treat as paid while receiving no money. If `PAYMENT_MODE=mock` is explicitly set in production, the mock payment action can also mark orders paid.

**Impact:** direct financial loss and fraudulent orders.

**Remediation:**

- Add a startup/build-time payment configuration assertion.
- In production, require `PAYMENT_MODE=live`, live gateway hosts, and live merchant keys.
- Allow `sandbox`/`mock` only when `NODE_ENV !== "production"` or an explicit `ALLOW_TEST_PAYMENTS=true` is set on a non-production preview.
- Make `mockPayAction` check `getPaymentMode()` **and** the environment, not only the raw env variable.
- Add a deployment preflight/test that fails if production uses a sandbox URL, key prefix, or mode.
- Log a prominent startup warning when test payments are enabled.

### H2 — Destructive seed creates a known-password staff account

**Severity:** High  
**Evidence:** `prisma/seed.ts:4-5` (explicitly destructive), `prisma/seed.ts:586` (fixed demo password), `prisma/seed.ts:600-607` (demo STAFF account), `prisma/seed.ts:1478-1479` (passwords printed to logs).

The seed clears the database and creates demo users, including a `STAFF` account whose password is hard-coded. There is no production guard. If it is run against a production database—common during first deployment—it destroys data, creates a known staff login, and writes credentials to deployment logs.

**Impact:** data loss, unauthorized staff access to orders/reservations/messages and customer PII, credential leak through logs.

**Remediation:**

- Refuse to run when `NODE_ENV=production` or the database is non-local; do not add an override.
- Require a separate `SEED_DEMO_DATA=true` flag for demo customers, staff, orders, and reviews; never create demo staff in production.
- In production, create only the initial admin from `SEED_ADMIN_*`, force a password change on first login, and never log the password.
- Remove/rotate demo accounts in any shared database.
- Keep a separate production bootstrap script that does not delete data.

### H3 — Service worker caches sensitive pages and bearer tokens

**Severity:** High (privacy/data exposure on shared devices)  
**Evidence:** `public/sw.js:43-57`.

Every same-origin GET navigation is cached unless the path starts with `/api/`, `/admin`, `/account`, or `/checkout`. That leaves:

- `/order/[orderNumber]?token=...` — full order details, customer name/phone/email/address, payment status.
- `/print/receipt/...?token=...` — printable receipt with the same PII.
- `/reset-password?token=...` — password-reset token is serialized into the page/RSC payload.
- `/verify-email?email=...&token=...` — email-verification token.
- `/track?order=...` — order number and tracking context.

Cached responses survive logout and are stored in the browser profile's Cache Storage. A later user of the same browser profile can retrieve them offline or via DevTools. This turns a one-time reset/order token into a persistent local secret.

**Impact:** account takeover via a cached password-reset token; order PII exposure; unauthorized cancellation/receipt access on shared devices.

**Remediation:**

- Replace page caching with an allowlist of public marketing pages only.
- Do not cache `/order`, `/print`, `/track`, `/reset-password`, `/verify-email`, `/login`, `/register`, or any response with `Cache-Control: no-store/private` or `Set-Cookie`.
- Clear the page cache on logout and on account switch.
- Bump `CACHE_VERSION` when changing cache behavior so existing clients purge old caches.
- Consider removing navigation caching entirely; offline support is not worth storing bearer tokens.

### H4 — SQLite database and uploaded files are not gitignored

**Severity:** High (latent secret/PII leakage)  
**Evidence:** `.gitignore` (no `prisma/*.db*` or uploads entry); `prisma/dev.db` exists and contains seeded users, password hashes, orders, and audit data.

The project is not currently a git repository, so nothing has been committed yet. If it is initialized and pushed, zipped, or shared as a folder, the development database will travel with it. It contains bcrypt password hashes, customer PII, and seeded order data. The demo accounts also have known passwords.

**Remediation:**

- Add `prisma/*.db`, `prisma/*.db-journal`, `prisma/*.db-wal`, `prisma/*.db-shm`, and `public/images/uploads/` to `.gitignore`.
- If the database has ever been committed or shared, remove it from history and rotate demo/admin credentials.
- Keep production data in PostgreSQL; never deploy `dev.db`.
- Run a secret scan (e.g. `gitleaks`) before the first commit.

## Medium findings

### M1 — Open redirect through `safeNextPath` backslash bypass

**Evidence:** `src/lib/utils.ts:149-152`; used by `loginAction` and Google `redirectTo`.

`safeNextPath` rejects values starting with `//` but accepts `/\evil.com`. Node and browsers normalize the backslash for special URL schemes:

```js
new URL("/\\evil.com", "https://app.example").href;
// "https://evil.com/"
```

An attacker can send a login link with `?next=/\evil.com`; after a successful login or Google OAuth redirect, the user can be sent to an attacker-controlled site. This is a phishing/open-redirect issue, not direct account takeover.

**Remediation:** parse the candidate with `new URL(value, origin)`, require the resulting origin to equal the app origin, reject backslashes and control characters, and only return `pathname + search + hash`. Add regression tests for `//evil.com`, `/\evil.com`, `%5c`, and encoded slash variants.

### M2 — CSV formula injection in admin exports

**Evidence:** `src/lib/csv.ts:1-9`.

`csvValue` quotes commas, quotes, CR/LF, and leading/trailing whitespace, but does not neutralize spreadsheet formulas. A customer name, order note, address, review, or audit field starting with `=`, `+`, `-`, `@`, tab, or carriage return can execute a formula when an administrator opens the CSV in Excel/LibreOffice. Even quoted cells can be interpreted as formulas.

**Impact:** formula/DDE execution on an admin workstation, data exfiltration, or misleading totals when reports are opened.

**Remediation:** prefix a single quote to any cell whose first character is `=`, `+`, `-`, `@`, tab, or CR, then apply quoting. Add unit tests for all export routes. Consider using a CSV library with formula-injection protection.

### M3 — Rate limiting is bypassable or ineffective in production

**Evidence:** `src/lib/rate-limit.ts:55-76`, `src/lib/security.ts:75-83`, `src/actions/auth.ts:53-57`, `src/auth.ts:42-46`.

- If Upstash is not configured (the local `.env` has empty Upstash values), the fallback is an in-process `Map`. On serverless/multi-instance deployments each instance has its own counters, so the effective limit is multiplied by the number of instances.
- `getClientIp()` trusts the first `x-forwarded-for` entry. On a directly reachable or misconfigured proxy, attackers can spoof it. If no proxy headers exist, all clients share the `"unknown"` bucket, which can also be used to exhaust limits for everyone.
- Login limiting is per IP + email, with a separate per-email limit inside Auth.js. There is no global per-IP login limit, so an attacker can spray one password across many emails from one IP.
- `clearExpiredLimitBuckets()` exists but is never called, so the in-memory map can grow under many unique identifiers.

**Impact:** credential stuffing, brute force, form/email spam, and denial of service against public actions.

**Remediation:**

- Require Upstash (or an equivalent shared store) in production; fail closed or alert loudly if it is unavailable.
- Prefer a trusted platform header (`cf-connecting-ip`, Vercel's normalized XFF) and validate the IP; document the trusted-proxy boundary.
- Add a per-IP global limit for login, password reset, registration, and verification resend, in addition to per-account limits.
- Periodically call `clearExpiredLimitBuckets()` or use a bounded store.
- Consider Vercel Firewall/WAF rules for `/login`, `/api/auth`, and public form actions.

### M4 — One-time email tokens are written to logs when Resend is not configured

**Evidence:** `src/lib/email.ts:76-83`.

`sendEmail` logs the full text body whenever `RESEND_API_KEY` is absent, in **every** environment. Password-reset and email-verification messages contain one-time tokens. If production is deployed without a Resend key, reset/verification links are written to server/Vercel logs, where project members or log integrations can read them. `.env.example` describes this as local logging, but the code does not restrict it to development.

**Impact:** account takeover if a reset token is read from logs; verification-link abuse; PII in logs.

**Remediation:** log only when `NODE_ENV !== "production"`, redact tokens/URLs, and fail closed (or raise a health-check alert) if auth emails cannot be sent in production. Do not log full email bodies.

### M5 — No Content-Security-Policy or modern isolation headers

**Evidence:** `next.config.ts:23-40`.

The app sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS, but no CSP, COOP, or CORP. This leaves no browser-level mitigation for a future XSS and only legacy clickjacking protection.

**Remediation:** add a nonce-based CSP compatible with the installed Next.js version (read the bundled Next docs first), with `default-src 'self'`, `script-src` nonce/`strict-dynamic`, `style-src` as needed for Tailwind, explicit `img-src`/`connect-src`/`form-action`, `frame-ancestors 'none'`, `object-src 'none'`, and `base-uri 'self'`. Start in report-only mode, verify payment provider redirects and Google OAuth, then enforce. Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` where compatible.

### M6 — No MFA for administrator or staff accounts

**Evidence:** `src/auth.ts:27-...` (credentials and optional Google only); no TOTP/WebAuthn dependency.

An admin account takeover gives full control of catalogue, prices, customers, coupons, settings, staff, exports, and audit logs. The admin identity also receives all admin notifications. Password + Google is not sufficient for this level of access.

**Remediation:** require TOTP or passkeys for `ADMIN` (and ideally `STAFF`), add step-up authentication for sensitive actions (staff management, settings, exports, refunds), alert on new-device/location logins, and use a dedicated admin identity rather than a personal mailbox. Enforce MFA before launch if feasible.

### M7 — Dependency advisories

**Evidence:** `npm audit` / `npm audit --omit=dev`.

- Overall: **20 advisories** — 2 critical, 15 high, 3 moderate.
- Production-only: **7 high**.
- Critical: `vitest@2.1.9` / `tinypool` — development test tooling, not shipped.
- High runtime-related: `uploadthing@7.7.4` and `@uploadthing/react@7.3.3` through `effect<3.20.0` (AsyncLocalStorage context contamination under concurrent RPC). UploadThing is optional and currently used for profile/admin uploads.
- High build/CLI-related: `prisma@6.19.3` through `deepmerge-ts`; `eslint-config-next` through `fast-glob`/`braces`/`micromatch` (development).
- `next@16.4.2` is not flagged.

**Remediation:** upgrade Vitest to a fixed major (3.2.6+ or 4.x) and run the test suite. Upgrade UploadThing when a patched release is available; if uploads are not needed, remove the dependency. Prisma 7 is a breaking major—plan and test it separately. Do **not** run `npm audit fix --force` blindly. Track advisories and re-audit before each release.

## Low findings and hardening

| ID  | Finding                                                                      | Evidence                                             | Recommendation                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `trustHost: true` is unconditional                                           | `src/auth.ts:22`                                     | Derive from `AUTH_TRUST_HOST`/Vercel, require `AUTH_URL`, and validate the host in self-hosted deployments.                                                                                                                                       |
| L2  | `assertSameOrigin` fails open without `Origin` and trusts `x-forwarded-host` | `src/lib/security.ts:91-106`                         | Keep Next.js's built-in action protection; for custom routes, require a trusted origin or a CSRF token, and only trust proxy headers from known proxies.                                                                                          |
| L3  | Order token is a long-lived bearer credential in URLs                        | `src/lib/security.ts:108-110`, order/print pages     | Tokens are strong (24 bytes), but they appear in history/logs/screenshots and authorize view/cancel/print/review. Consider short-lived/scoped tokens, `Referrer-Policy: no-referrer` on token pages, and phone/OTP confirmation for cancellation. |
| L4  | Track-order phone match accepts any suffix                                   | `src/actions/orders.ts:609-617`                      | Compare normalized full numbers (last 10 digits) rather than `endsWith`; keep the IP rate limit.                                                                                                                                                  |
| L5  | Payment success/failure race could overwrite `PAID` with `FAILED`            | `src/lib/payments.ts:479-515`                        | Use conditional updates (`where paymentStatus != PAID`) and re-check the row inside the transaction.                                                                                                                                              |
| L6  | Coupon usage limit is checked before an unconditional increment              | `src/actions/orders.ts:402-406`                      | Use a conditional `updateMany` with `usedCount < maxUses` and roll back if no row was updated; consider per-customer limits.                                                                                                                      |
| L7  | Profile image URL accepts any URL scheme and has no length cap               | `src/lib/validations.ts:83-86`                       | Require `https://` (or a local upload path) and a max length; restrict to known image hosts.                                                                                                                                                      |
| L8  | Profile uploads are available to any signed-in user without a per-user limit | `src/lib/uploadthing.ts` (`profileImage`)            | Add per-user rate limits and cleanup/replacement so storage cannot be filled anonymously.                                                                                                                                                         |
| L9  | Provider transaction ID is interpolated into admin email HTML unescaped      | `src/lib/payments.ts:465-470`                        | Wrap `transactionId` and `provider` in `escapeHtml`; treat provider strings as untrusted.                                                                                                                                                         |
| L10 | Personal admin email appears in committed template/fallback code             | `.env.example`, `src/lib/email.ts`, `prisma/seed.ts` | Use a placeholder in `.env.example`, require the real value from server env, and keep the admin mailbox out of the repository. The public UI correctly uses the public contact address.                                                           |
| L11 | Account enumeration and login timing                                         | `src/actions/auth.ts:68-86`, registration            | Registration reveals an existing email; login returns immediately for unknown emails and runs bcrypt for known ones. Use a generic registration response and a dummy bcrypt hash for unknown accounts if enumeration is a concern.                |
| L12 | In-memory rate-limit buckets are never pruned                                | `src/lib/rate-limit.ts:93-98`                        | Call the cleanup periodically or use Upstash only.                                                                                                                                                                                                |

## Controls verified as sound

- **Authorization:** every admin action file uses `adminActionUser`/`staffActionUser`; admin pages use `requireAdmin` or `requireStaff`; export routes use `requireExportUser`; KOT is admin-only; receipts allow owner, valid guest token, or staff.
- **Sessions:** JWT sessions with database re-checks for role, blocked status, and `sessionVersion`; password reset and account blocking invalidate old sessions.
- **Passwords/tokens:** bcrypt cost 12; reset/verification tokens are hashed at rest, single-use or expiring; reset invalidates other reset tokens.
- **Payments:** eSewa HMAC signature verification plus status lookup; Khalti lookup; amount, product/merchant code, order reference, and provider reference checks; redirect allowlists; environment/host guards; idempotent "already paid" handling.
- **Uploads:** admin-only local uploads, same-origin assertion, 10 MB limit, magic-byte detection, folder allowlist, random filenames, no SVG.
- **Input/output:** Zod validation on actions; Prisma parameterization (no raw SQL found); React escaping; JSON-LD escapes `<`; email templates escape most user data; no `eval`/command execution found.
- **Headers:** `nosniff`, frame denial, referrer policy, permissions policy, HSTS, `X-Powered-By` disabled.
- **Exports/audit:** CSV endpoints require staff/admin roles and write audit logs; sensitive admin pages are `noindex`.

## Pre-launch checklist

- [ ] Fix H1–H4 before deploying.
- [ ] Set `PAYMENT_MODE=live` with live keys and live gateway hosts; verify no sandbox host/key is present.
- [ ] Do not run the destructive seed in production; create the admin with a guarded bootstrap; rotate the initial password; remove demo accounts.
- [ ] Set a strong `AUTH_SECRET`, HTTPS `AUTH_URL` and `NEXT_PUBLIC_APP_URL`; configure `AUTH_TRUST_HOST` only as needed.
- [ ] Configure Upstash and test that limits are shared across instances.
- [ ] Configure Resend with a verified domain; test reset/verification delivery; confirm no tokens are logged.
- [ ] Use PostgreSQL with SSL/backups and a least-privilege database user; run migrations, not `db push`.
- [ ] Add DB/uploads to `.gitignore`; run a secret scan before the first commit.
- [ ] Add CSP (report-only first); verify payment/Google flows; then enforce.
- [ ] Add MFA for admin/staff; restrict Google OAuth redirect URIs; review admin email routing.
- [ ] Bump the service-worker cache version and verify that no `/order`, `/print`, `/reset-password`, or `/verify-email` response is cached.
- [ ] Re-run `npm run lint`, `npm run typecheck`, `npm run build`, and the Vitest suite.
- [ ] Re-test eSewa/Khalti sandbox completion, receipts, thermal sizing, and KOT access after changes.

## Limitations

This review is source-based. It did not include a live penetration test, production infrastructure review, browser exploitation, or end-to-end sandbox payment completion. Dependency exploitability depends on the deployed feature set (UploadThing and the Prisma CLI are optional/build-time in this app). Re-test after fixing the items above, especially the service worker and payment-mode guards.
