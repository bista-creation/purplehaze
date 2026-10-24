# Security & Launch Audit — Purple Haze Restro & Garden

**Date:** 23 October 2026  
**Target:** `https://purplehaze-nine.vercel.app` and the current working tree  
**Scope:** Authentication and authorization, session handling, payment initiation/callbacks, order and customer access, admin/staff actions, uploads, exports, input validation, secrets exposure, RLS, security headers, client bundles, dependencies, and the public legal pages.  
**Method:** Source review, production HTTP checks, Vercel configuration-name review, public client-bundle scanning, local unit tests, typecheck, lint, Prisma validation, and dependency audit.  
**Status:** This is a targeted pre-production audit, **not** a complete penetration test, security certification, or legal opinion.

---

## Executive summary

No critical authorization bypass was found in the reviewed application code. The serious issues are deployment/configuration and operational gaps, plus legal copy that does not match the implementation.

**Most urgent:** production is accepting orders from a populated real menu while eSewa and Khalti are running in **sandbox** mode. The live checkout exposes `paymentMode: "sandbox"` with both online methods enabled. Sandbox wallets can create orders that the application treats as paid, so real food could be prepared and delivered without real payment. This is a **critical launch blocker** and must be disabled or switched to live payments before further public ordering.

| Severity | Count | Summary |
|---|---:|---|
| Critical | 1 | Live sandbox online payments against a real, orderable menu |
| High | 4 | Email delivery likely restricted; no shared rate limiting; no MFA; no CSP/third-party Maya iframe |
| Medium | 10+ | Capability-token leakage, legacy Supabase JWT secret, unverified production RLS, retained bootstrap password, legal/privacy gaps, newsletter consent, Maps cookies, origin/IP checks |
| Low | Several | Dependency debt, admin-only link input, PWA path mismatch, missing COOP/CORP, enumeration/timing |

---

## 1. Critical

### C1 — Production is accepting real orders with sandbox eSewa/Khalti

**Evidence (live, 23 October 2026):**

- `/menu` contains real categories and dishes (for example, Beijing Chicken at Rs 495 and Chilly Garlic Prawns at Rs 850) and renders “Accepting orders.”
- `/checkout` server data includes:
  - `"paymentMode":"sandbox"`
  - `"esewaEnabled":true`
  - `"khaltiEnabled":true`
  - `"codEnabled":true`
  - `"taxRate":13`, `"serviceChargeRate":0`
- Production Vercel environment contains `PAYMENT_MODE=sandbox` and `PAYMENT_SANDBOX_UNTIL=2026-10-28T18:14:59.000Z`.
- `ALLOW_TEST_PAYMENTS` is configured as a Production secret.
- No live `ESEWA_SECRET_KEY` or `KHALTI_SECRET_KEY` is present in the production environment listing; the sandbox path therefore uses the public sandbox fallbacks in `src/lib/payments.ts`.
- The site is currently marked as accepting orders and the menu is populated. The earlier assumption that the production menu was empty is no longer true.

**Impact:** A person can place a real order and complete a sandbox wallet payment. The callback/lookup can mark the order `PAID`, and staff may accept, prepare, and deliver it as a genuine paid order. That is direct food and revenue loss. Even without completing a payment, the exposed sandbox checkout is not suitable for customers.

**Immediate mitigation (owner approval required for production changes):**

1. Disable eSewa and Khalti in the admin payment settings, leaving cash on delivery if desired, **or**
2. Pause ordering with the `order.acceptingOrders` setting, **or**
3. Switch to live provider credentials and test with a real low-value transaction.

Removing the `ALLOW_TEST_PAYMENTS` production secret would also disable the sandbox online path, but it requires a redeploy/environment change. Do not wait until `2026-10-28T18:14:59.000Z`; the window is currently open.

---

## 2. High

### H1 — Customer transactional email is likely undeliverable

**Evidence:** Production `EMAIL_FROM` is on the `resend.dev` test domain (`Purple Haze <***@resend.dev>`); the exact local part was redacted. Resend’s shared test domain is intended for sending only to the account owner unless a domain is verified. A real external recipient test was not performed.

**Impact:** Registration verification, password-reset, order confirmation, and other customer emails may fail. Credential accounts cannot sign in until `emailVerified` is set; password recovery would silently fail. Admin notification mail to the configured Gmail address may still work because it is the account owner.

**Action:** Verify a restaurant domain in Resend, set `EMAIL_FROM` to that domain, and send a test to an unrelated external mailbox. Until then, do not rely on email verification or password recovery.

### H2 — Production rate limiting is per-instance memory, not shared

**Evidence:** No Upstash variables are present in the production environment. `src/lib/rate-limit.ts` falls back to an in-process `Map`. The Auth.js credentials endpoint is directly callable and previously had only an email-based limit; a per-IP limit was added in this audit, but it is still per-instance.

**Impact:** An attacker can spread attempts across serverless instances, bypass practical limits, credential-stuff staff accounts, spam registration/contact/newsletter endpoints, and increase database/blob costs. The new IP limit raises the cost but does not solve shared-state enforcement.

**Action:** Add Upstash Redis (or an equivalent shared limiter/WAF) and verify limits across multiple instances. Consider a platform WAF/bot rule for `/api/auth/*`, `/track`, checkout, and public forms.

### H3 — No MFA for admin/staff; long-lived sessions

**Evidence:** Auth.js uses JWT sessions with a 30-day maximum age and 24-hour update age. Staff/admin accounts have passwords and optional Google sign-in, but no second factor. Admin sessions can change settings, prices, refunds, customers, content, and staff accounts.

**Impact:** One phished or reused admin password gives prolonged control of the restaurant’s public site and order data. Google account security may help, but app-level MFA is absent.

**Action:** Require MFA for ADMIN (and preferably STAFF), shorten admin session lifetime, and consider re-authentication for refunds/settings. At minimum, enforce strong unique passwords and monitor failed staff logins.

### H4 — No Content-Security-Policy; Maya now loads as a third-party iframe

**Evidence (updated 24 October 2026):** Live headers include HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options`, but **no `Content-Security-Policy`**. The old unpinned ElevenLabs script has been removed in commit `d607c93`; deployment was still pending at the time of writing. `src/components/voice/purple-haze-assistant.tsx` now embeds:

`https://mani-ai-psi.vercel.app/embed/purple-haze`

The iframe is cross-origin, returns `200`, has no `X-Frame-Options`, and sends `frame-ancestors 'self' https://purplehaze-nine.vercel.app https://purplehaze.com.np http://localhost:3000 http://127.0.0.1:3000`. The top-level `Permissions-Policy` was updated to allow microphone delegation to that origin. The Google Maps iframe is also third-party content.

**Impact:** Moving the assistant into a cross-origin iframe removes the previous top-level third-party script risk; the iframe cannot read the parent DOM or its cookies. However, the main site still has no CSP, so any future XSS in the top-level origin would execute with site/admin privileges. The iframe origin can also change independently and can request microphone access, so its deployment and content need trust. CSP remains an important defense-in-depth control.

**Action:** Introduce a tested CSP in report-only mode first. Include `script-src`, `frame-src` for `https://mani-ai-psi.vercel.app` and Google Maps, `connect-src` for Supabase/assistant APIs, and `frame-ancestors`. Verify the iframe's `frame-ancestors` allowlist whenever the production/custom domain changes. Do not add a blanket third-party script exception.

---

## 3. Medium

### M1 — Production RLS state is unverified and local CRUD/RLS tests could not run

The migration `supabase/migrations/20261020000100_rls_and_realtime.sql` enables RLS on every existing public table, revokes `anon`/`authenticated` table and sequence privileges, grants `authenticated` SELECT only on `Notification`, and limits the Realtime publication to `Notification`. The policy checks `app_role` STAFF/ADMIN, hides test rows, and limits rows by `userId` or global notifications.

However:

- Docker/Podman is unavailable and the local Supabase stack is not running, so the local verifier could not be executed.
- Production RLS application was not queried; no production database access was used.
- The migration enables RLS on tables that exist **at migration time**. New Prisma tables need a follow-up migration to enable RLS; default privileges reduce browser access but do not themselves enable RLS.

**Action:** Run the local verifier when Docker is available, verify production RLS/grants through a read-only admin query approved by the owner, and add a migration check/test for any new table.

### M2 — Retained `SEED_ADMIN_PASSWORD` can reset the admin account

`SEED_ADMIN_PASSWORD` remains configured in Production and Preview. `prisma/ensure-admin.ts` requires `ADMIN_BOOTSTRAP_CONFIRM=APPLY`, so it is not automatic, but an operator who runs `npm run admin:ensure` can reset the existing admin password and increment `sessionVersion`. The password is marked Config, not Secret.

**Action:** Remove `SEED_ADMIN_PASSWORD` (and other bootstrap values) from Vercel after confirming admin access; rotate the admin password if the script was run after the owner’s password change. Keep one-time bootstrap credentials outside the deployed environment.

### M3 — `SUPABASE_JWT_SECRET` is a powerful legacy signing secret

The server signs five-minute Supabase Realtime tokens with `SUPABASE_JWT_SECRET`. The browser receives only the short-lived token, not the secret, and public client chunks contained no Supabase host or JWT-like values. But the legacy Supabase JWT secret can mint tokens with elevated roles if it leaks; its compromise is more serious than a normal app secret.

**Action:** Treat it as a high-value secret, restrict access, document rotation (coordinate with Supabase/Vercel and Realtime), and rotate immediately if exposure is suspected. Do not place it in any `NEXT_PUBLIC_*` variable.

### M4 — Capability tokens in URLs expose order PII

Order access uses `orderNumber` plus a bearer `publicToken` in the URL. The token appears in browser history, shared links, copied URLs, print toolbar links, and potentially logs. `trackOrderAction` returns the token after a lookup using the order number and phone (15 attempts/10 minutes per IP). Anyone with a leaked link can view order/customer details, print a receipt, cancel where allowed, or submit a review.

**Action:** Consider moving the token to a short-lived HttpOnly cookie after the initial lookup, add `Referrer-Policy: no-referrer` on token-bearing pages, avoid putting tokens in page links where possible, and add token expiry/revocation if operationally feasible.

### M5 — `assertSameOrigin` fails open when Origin is absent

`src/lib/security.ts` returns without rejection when the `Origin` header is missing. Browser cross-site POSTs normally send Origin and SameSite cookies reduce CSRF, and server actions have their own protections. Custom route handlers such as upload/payment initiation rely on session/token checks. Still, the helper is not a strict CSRF gate for non-browser or unusual requests.

**Action:** For mutating custom routes, require either an allowed Origin or a valid CSRF token; do not treat “missing Origin” as automatically same-origin. Review each route rather than changing the helper globally without tests.

### M6 — `getClientIp` trusts forwarded headers

The rate limiter trusts the first `X-Forwarded-For`/`X-Real-IP` value. If the platform does not overwrite client-supplied headers, an attacker can choose a new bucket per request.

**Action:** Confirm Vercel’s header behavior, prefer a platform-provided trusted client IP, and consider the last trusted proxy hop. Add the WAF/shared limiter rather than relying on IP alone.

### M7 — Legal copy conflicts with actual behaviour

Material mismatches found (full proposed wording in `LEGAL_REVIEW_DRAFT_2026-10-23.md`):

- Terms imply an online-paid order may be accepted while payment is pending; `evaluateOrderAcceptance` blocks acceptance until `PAID`.
- Delivery policy/FAQ say 30–45 minutes; checkout says 25–35 minutes.
- Delivery policy advertises free-delivery thresholds; no such logic exists.
- Refund policy implies automatic provider reversal and 24–48 hour processing; refunds are recorded manually after a human completes the provider refund.
- Undeliverable/prepaid refund wording conflicts between Terms, Delivery and Refund pages.
- Privacy Policy omits the Maya assistant module, Google Maps, cross-border processors, and the privacy consequence of order links.
- Newsletter says “Unsubscribe anytime” but there is no unsubscribe route/token and no newsletter sending code.
- Tax/service-charge wording is ambiguous; checkout adds VAT (default 13%) and a configurable service charge separately.
- No Cookie/Local Storage Policy; the Google Maps iframe can set third-party storage.
- No Maya safety disclaimer for allergens, prices, payments, or urgent matters.

**Action:** Owner/legal review, then publish only the approved copy. Do not update `LEGAL_UPDATED` yet. The current policies are not safe to leave as-is once online ordering is public.

### M8 — Newsletter has no double opt-in or unsubscribe mechanism

`subscribeNewsletterAction` immediately stores `isActive: true`, with no confirmation email and no unsubscribe endpoint. Someone can subscribe another person’s address. The privacy policy currently promises “Unsubscribe anytime.”

**Action:** Add double opt-in and a signed unsubscribe route (or a monitored manual removal process), add unsubscribe headers when sending, and change the copy until the mechanism exists.

### M9 — Google Maps loads without a consent step

The contact page loads a Google Maps iframe automatically. Google may receive the visitor IP and set cookies/storage. The Privacy Policy mentions Google only for sign-in.

**Action:** Disclose the embed and Google’s role, or replace it with a click-to-load map. Add a Cookie/Local Storage Policy if counsel requires one.

### M10 — Profile image URLs can load third-party trackers (low impact)

`profileSchema` accepts any `https://` image URL up to 2,048 characters. A user can point their profile photo at a third-party tracking pixel or a URL that changes over time. The separate admin catalogue upload route is protected: 4 MB limit, image signature check, UUID filename, 30 uploads/10 minutes per admin, and server-side Blob/local storage. UploadThing’s `profileImage` route is not active in production because no UploadThing token is configured.

**Action:** If profile URLs are retained, restrict them to approved image hosts or proxy them. If UploadThing is enabled later, add per-user limits and confirm metadata handling. This is lower priority than the payment, email, rate-limit and CSP issues above.

### M11 — Admin-only banner CTA link is not URL-scheme validated

`bannerAdminSchema.ctaHref` accepts any string and the home page passes it to `next/link`. A malicious or compromised admin could store a `javascript:` URL that executes when another admin/visitor clicks the CTA. Admin-only and lower risk, but avoidable.

**Action:** Restrict to same-origin paths or `https://` URLs; reject `javascript:`, `data:`, and protocol-relative URLs.

### M12 — Production dependency audit has seven high-severity advisories

`npm audit --omit=dev` reports 7 high advisories, all in Prisma CLI/config and UploadThing/Effect dependencies; the full tree has 18 advisories including 2 critical dev-only advisories. UploadThing is not configured in production, and Prisma CLI is build-time, which lowers exploitability, but the dependency debt remains.

**Action:** Plan tested upgrades to Prisma 7.x and UploadThing/Effect; do not use `npm audit fix --force` on production without a regression plan. Re-run the audit after upgrades.

---

## 4. Verified controls

These checks passed at the source/live level; they are not a complete assurance.

- **Session/authorization:** `getCurrentUser` rechecks the database for role, blocked status, and `sessionVersion`; admin pages/actions use `requireAdmin`/`adminActionUser`; reports restrict roles; customer actions scope by `userId`; print receipt is owner/staff/token scoped and KOT is admin-only.
- **Payments:** Provider callbacks verify signatures/lookups, amount and transaction references, and status guards. Khalti initiation now has a 15-second timeout and conditional updates so a concurrent PAID/REFUNDED/CANCELLED order is not overwritten. eSewa callback/lookup guards were reviewed.
- **Uploads:** Admin custom upload route checks admin role, file signatures, 4 MB limit, UUID names, and local-only writes; UploadThing `adminImage` requires ADMIN.
- **Injection/XSS:** Prisma parameterization; CSV formula injection is neutralized in `src/lib/csv.ts`; JSON-LD escapes `<`; no user-controlled `dangerouslySetInnerHTML` found in the reviewed pages.
- **Secrets:** `.env`/`.env.local` are untracked and gitignored; only `.env.example` is tracked. Source scan found no service-role key reference. Production Vercel env listing contains no service-role key name and no UploadThing token.
- **Client bundles:** 28 unique JavaScript chunks referenced by `/`, `/menu`, `/checkout`, `/login`, and `/privacy-policy` were fetched and scanned (about 1 MB on the homepage set). No JWT-like values, Supabase host, `service_role`, `sb_secret_`, or common secret variable names were found. Authenticated admin-only chunks were not exhaustively scanned.
- **Headers:** Live `/` returns HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. CSP, COOP, and CORP are absent.
- **RLS migration:** Default-deny grants for `anon`/`authenticated`, SELECT only on `Notification`, test-row filtering, staff/admin policy, and Realtime publication limited to `Notification`.
- **Order cache:** Order pages are dynamic/noindex and excluded from the service-worker navigation cache; private prefixes include `/order`, `/print`, `/track`, `/account`, `/checkout`, `/login`, and auth flows.
- **Local checks:** `npm test` 64/64, `npm run typecheck`, `npm run lint`, and `npx prisma validate` all passed.

---

## 5. Fixes applied in the working tree

These changes are **not committed or deployed**. The unrelated homepage overlay edit in `src/app/(site)/page.tsx` was left untouched.

| File | Change |
|---|---|
| `src/app/api/payments/khalti/initiate/route.ts` | Added `AbortSignal.timeout(15_000)`; replaced unconditional order updates with `updateMany` guards that do not overwrite `PAID`, `REFUNDED`, or `CANCELLED` orders. |
| `src/auth.ts` | Removed client-supplied `name`/`image` writes during `trigger === "update"`; the JWT refresh now uses database values. Added an IP-wide credentials-endpoint rate limit (50/10 minutes) so the Auth.js endpoint cannot spray many emails past the form-level IP+email limit. |
| `src/lib/validations.ts` | Staff password now uses `passwordSchema` (letter + number) instead of an 8-character-only minimum; blank remains allowed for edits without a password change. |
| `src/actions/auth.ts` | Forgot-password now deletes older unused reset tokens in the same transaction before creating the new one. |
| `src/lib/rate-limit.ts` | Periodically clears expired in-memory buckets; this does not replace shared rate limiting. |
| `src/lib/validations.test.ts` | Added two tests for the staff password policy. |

**Verification:** 9 test files / 64 tests passed; typecheck, ESLint, and Prisma schema validation passed. No production deployment or database migration was performed.

---

## 6. Blocked or not performed

- **Local RLS/CRUD tests:** Docker/Podman unavailable; local Supabase not running. The authorized/unauthorized SELECT, INSERT, UPDATE, DELETE, customer-isolation, and admin-only tests were **not executed**.
- **Production RLS state:** not queried; applying or inspecting it requires owner approval and database credentials.
- **Production secret values:** 12 Vercel secrets are hidden; the anon key’s role (publishable/anon vs. service-role) was not decoded. No Supabase host appeared in public chunks, which is consistent with server-only database access but does not prove the hidden key type.
- **Live payment completion:** not run, because it would create a real/sandbox order and could disturb production. The sandbox exposure was confirmed from configuration and live checkout data, not by completing a payment.
- **Maya embedded assistant:** the embed URL returned HTTP 200 and its `frame-ancestors` header allows `purplehaze-nine.vercel.app`, `purplehaze.com.np`, and localhost. A live voice/text conversation was not re-tested. If the site moves to `www` or another host, that allowlist must be updated in the assistant deployment.
- **External email delivery:** not sent. The `resend.dev` sender is a strong indication of restriction, but a real external-recipient test is required.
- **Admin-only client chunks:** not scanned because no production admin session was used.
- **Penetration test/load test:** not performed. This report is not a certification.

---

## 7. Manual actions, in priority order

1. **Now:** Disable eSewa/Khalti or pause ordering. Do not leave live sandbox payments against the populated menu.
2. **Before launch:** Verify a Resend domain and send a real external test for registration, reset, and order email.
3. **Before launch:** Add Upstash/WAF shared rate limiting; confirm the new Auth.js IP limit actually spans instances.
4. **Before launch:** Enable MFA for admin/staff and shorten admin sessions.
5. **Before launch:** Remove `SEED_ADMIN_PASSWORD` from Vercel; rotate the admin password if `admin:ensure` was run after the owner changed it.
6. **Before launch:** Add a tested CSP (report-only first) with an explicit `frame-src` for the assistant and Google Maps; review Google Maps consent.
7. **Before launch:** Obtain owner/legal approval for the legal corrections; publish only approved copy. Address newsletter double opt-in/unsubscribe and Maya privacy/safety disclosures.
8. **Before launch:** Verify production RLS and grants; run the local CRUD/RLS verifier when Docker is available; add a migration check for future tables.
9. **Before launch:** Add an external backup/restore plan for the production database and confirm retention periods.
10. **Shortly after:** Harden order-token handling and referrer policy; review `assertSameOrigin`/client-IP handling; restrict profile image URL hosts; validate banner CTA URLs.
11. **Planned:** Upgrade Prisma/UploadThing dependencies with regression tests; re-run `npm audit`.
12. **Confirm:** In the Supabase dashboard, verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the publishable/anon key and that no service-role key exists in Vercel or client code.

---

## 8. Legal review

The full proposed text and owner-decision checklist are in:

`LEGAL_REVIEW_DRAFT_2026-10-23.md`

It covers payment acceptance, delivery timing/fees, refund fault rules and manual timing, the Maya assistant, Google Maps, cross-border processors, newsletter unsubscribe, taxes/service charge, order-link privacy, and cookie/local-storage disclosure. It is deliberately **not published** and does not claim to be legal advice.

---

## 9. Bottom line

The application’s server-side authorization and payment-verification design is materially stronger than a typical small-restaurant site. The current launch risk is not a missing `requireAdmin` check; it is the live **sandbox payment configuration**, followed by email deliverability, shared rate limiting, admin MFA, and the missing CSP. The legal pages should not be treated as launch-ready until the documented mismatches are corrected and reviewed.
