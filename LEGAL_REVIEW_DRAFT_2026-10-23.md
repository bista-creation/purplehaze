# Legal Copy Review — Purple Haze Restro & Garden

**Prepared:** 23 October 2026; updated 24 October 2026 for the Maya assistant replacement  
**Status:** Draft for owner and legal-adviser review. **Not published.**  
**Scope:** Privacy Policy, Terms & Conditions, Refund & Cancellation Policy, Delivery & Shipping Policy, FAQs, footer newsletter copy, and the missing Cookie/Local Storage notice.  
**Basis:** The current source code and live production behaviour as of 23 October 2026. This is not legal advice.

> Do not change `LEGAL_UPDATED` or publish these drafts until the owner has answered the decisions in section 1 and a qualified Nepali legal adviser has reviewed the final wording.

## 1. Decisions the owner/legal adviser must make

| # | Decision | Why it matters | Current code/site fact |
|---|---|---|---|
| 1 | Are menu prices VAT-inclusive, or is 13% VAT added at checkout? | The Terms currently say amounts “include applicable taxes where stated,” while checkout adds VAT separately. | `calculateOrderTotals` adds VAT (default 13%) on food + service charge after discount. Checkout displays “VAT (13%)” separately. |
| 2 | Is a service charge charged, at what rate, and is it refundable? | The checkout supports a service-charge line; the legal pages do not explain it. | Default is 0%, configurable in admin settings. Checkout shows it separately when non-zero. |
| 3 | Is there a free-delivery threshold? | The Delivery Policy currently says free-delivery thresholds are shown at checkout. | No free-delivery logic exists in the codebase. |
| 4 | What is the standard delivery estimate? | The policy/FAQ say 30–45 minutes; checkout says 25–35 minutes when the cart is non-empty. | The checkout estimate is hard-coded, not calculated from zone or prep time. |
| 5 | Who actually submits eSewa/Khalti refunds, and within what target? | The policy says payments are “reversed” and gives 24–48 business hours, but there is no provider refund API in the code. | Admin records a refund manually after completing it outside the app. No automated reversal. |
| 6 | If a prepaid order cannot be handed over because the customer is unreachable or refuses it, what is refundable? | Terms, Delivery Policy and Refund Policy currently give different impressions. | Code cancels the order and leaves any paid amount marked `PAID` until an admin records a manual refund. |
| 7 | Does Maya record/transcribe voice conversations, where are transcripts stored, and for how long? | The Privacy Policy does not mention the Maya assistant at all. | Maya is now embedded from `https://mani-ai-psi.vercel.app/embed/purple-haze`. The iframe’s `frame-ancestors` currently allows `purplehaze-nine.vercel.app`, `purplehaze.com.np`, and localhost. Retention/recording settings are inside that module and were not verified. |
| 8 | Is the Google Maps embed loaded automatically, or should it be click-to-load/consent-gated? | The embed can send the visitor’s IP address to Google and may set Google cookies/storage. | Contact page loads `SITE.mapEmbedUrl` in an iframe with `loading="lazy"`. |
| 9 | Will the newsletter use double opt-in and a working unsubscribe link? | The site says “Unsubscribe anytime,” but there is no unsubscribe endpoint/token and no newsletter-sending code. | `subscribeNewsletterAction` immediately upserts `isActive: true`; no confirmation email, no unsubscribe route. |
| 10 | What are the actual retention periods for orders, bookings, messages, reviews, newsletter records, audit logs and Maya conversations? | The Privacy Policy uses “as long as needed” without periods. | No scheduled deletion/retention job was found. |
| 11 | Which legal entity operates the restaurant/website, and what is its registration/address for formal notices? | The policies identify the restaurant location but not a registered legal entity. | `SITE` contains the trading name and address only. |
| 12 | Are cross-border transfers (hosting, database, email, payments, voice AI, maps) disclosed, and what safeguards apply? | The Privacy Policy does not mention international processing. | Vercel, Supabase, Resend, eSewa/Khalti, the Maya assistant host, and Google may process data outside Nepal. Confirm with counsel. |

## 2. Proposed Privacy Policy changes

### 2.1 Replace the “Marketing information” bullet

**Current**

> Marketing information: your email address if you join our newsletter, and limited interaction data where supported.

**Proposed**

> Marketing information: your email address, subscription status and the time you subscribed or changed your preferences. We do not currently run our own analytics or advertising tracking.

**Reason:** No analytics implementation was found. “Where supported” is vague and can be read as claiming tracking that does not exist.

### 2.2 Replace the newsletter sentence

**Current**

> To send newsletter emails where you subscribed. You can unsubscribe at any time.

**Proposed (until a real unsubscribe mechanism exists)**

> To send newsletter emails where you have subscribed. You can ask us to stop sending marketing emails at any time by contacting us using the details below; we will remove you from future marketing.

**Proposed (after double opt-in and an unsubscribe link are implemented)**

> To send newsletter emails where you have confirmed your subscription. Every marketing email will include a working unsubscribe link, and you can also contact us to be removed.

**Reason:** The current form says “Unsubscribe anytime,” but there is no unsubscribe route or token. Do not promise a self-service mechanism that does not exist.

### 2.3 Replace the cookies/local-storage section

**Current**

> We use essential cookies for sign-in, security and checkout. The website also uses browser local storage to remember your theme preference and shopping cart.
>
> We do not currently use advertising cookies. If analytics or advertising tools are added, this policy will be updated and consent will be requested where required.

**Proposed**

> We use essential cookies and similar storage for sign-in, security, checkout, the shopping cart and theme preference. Some pages also load third-party services that may receive technical information or set their own cookies/storage:
>
> - **Google Maps** on the contact page, to display the restaurant location. Google may receive your IP address and may set cookies or local storage.
> - **Maya assistant** when you use the chat panel. The assistant module at `https://mani-ai-psi.vercel.app/embed/purple-haze` may process your voice, audio, text messages and related technical data to provide the conversation.
> - **eSewa/Khalti** when you choose an online payment; their checkout pages are governed by their own privacy and cookie notices.
>
> We do not currently use our own analytics or advertising cookies. If we add analytics or advertising, we will update this policy and request consent where required. You can block third-party content in your browser, but the map or assistant may then not work.

**Reason:** The current wording says only “essential cookies” and denies advertising cookies, but it does not disclose the Google Maps iframe or the Maya assistant iframe. The statement about first-party analytics can remain if limited to “our own”; third-party embeds are the gap.

### 2.4 Add a Maya / AI assistant section

**Proposed new section, after “Payments and financial data”**

> **Maya, our AI assistant**
>
> Maya is an automated voice and text assistant provided through our embedded Maya module at `https://mani-ai-psi.vercel.app/embed/purple-haze`. When you use Maya, your voice/audio, text messages and related technical information may be processed to provide the conversation. Maya may make mistakes or misunderstand you. Do not rely on Maya for allergy, medical, pricing, payment or urgent safety information; please call the restaurant and confirm with our team. Do not share sensitive financial, password or identity information with Maya.
>
> [OWNER/LEGAL TO CONFIRM: whether conversations are recorded or transcribed, where they are stored, how long they are retained, and what data-processing terms apply to the Maya module.]

**Reason:** The iframe is live in the site layout, but the Privacy Policy does not identify the Maya module or explain voice processing. A safety disclaimer is also important because the assistant may answer menu/allergen questions.

### 2.5 Add a Google Maps paragraph

**Proposed, in the sharing/service-provider section**

> When you view the contact page, we embed a Google Map. Google may receive your IP address and information about your browser and may set cookies or similar storage. Google’s own privacy policy applies to that processing. If you prefer not to load Google content, use the “Open in Google Maps” link instead of the embedded map or block third-party content in your browser.

**Reason:** The embed loads from Google; the policy currently mentions Google only for sign-in.

### 2.6 Expand the service-provider/cross-border bullet

**Current**

> Hosting, database, email delivery, image hosting, rate limiting and payment providers that process information on our behalf.

**Proposed**

> Service providers that help us run the website and restaurant, including hosting and content delivery (Vercel), database and staff Realtime (Supabase), email delivery (Resend), payment processing (eSewa and Khalti), image hosting (Vercel Blob, and UploadThing where enabled), rate limiting (Upstash where enabled), the Maya assistant module hosted at `mani-ai-psi.vercel.app`, Google Maps, and Google sign-in where you choose it.
>
> Some of these providers may process information outside Nepal. [OWNER/LEGAL TO CONFIRM the countries/regions and the safeguards used for those transfers.]

**Reason:** The current category list is too vague for a policy that names payment providers; it omits Maya, Maps and cross-border processing.

### 2.7 Add order-link privacy wording

**Proposed, in “Your rights” or “Security”**

> An order page link contains a private access token. Anyone who has the link may be able to view the order, print a receipt, cancel the order where cancellation is still allowed, or submit a review. Keep the link private. If you share it with someone, they may see the order details and delivery address.

**Reason:** The shipping policy already says the link contains access; the Privacy Policy should explain the privacy consequence.

### 2.8 Retention wording

Do not invent periods. Replace the current general wording with specific periods once the owner decides them. A safe interim sentence is:

> We keep each category of information only for the period needed for the purpose described in this policy, or for a longer period where accounting, dispute-resolution, fraud-prevention or legal obligations require it. [OWNER/LEGAL TO CONFIRM PERIODS.]

## 3. Proposed Terms & Conditions changes

### 3.1 Fix the tax and service-charge sentence

**Current**

> All amounts are in Nepali rupees (NPR) and include applicable taxes where stated.

**Proposed**

> All amounts are in Nepali rupees (NPR). Menu prices are shown before checkout. Applicable VAT and any service charge are calculated and shown separately at checkout before you pay.

**Reason:** Checkout adds VAT separately (default 13%) and supports a separate service charge. “Include … where stated” is ambiguous and can be read as tax-inclusive pricing.

### 3.2 Fix the payment-acceptance sentence

**Current**

> Online payment success is verified with the provider before an order is marked paid. A payment status and an order fulfilment status are separate: an order may be accepted while an online payment is still pending, and cash orders may be accepted with cash due on delivery.

**Proposed**

> Online payment success is verified with the provider before an order is marked paid. A payment status and an order fulfilment status are separate. We do not accept an online-paid order for fulfilment until the provider has verified payment. Cash orders may be accepted with cash due on delivery or at handover.

**Reason:** `evaluateOrderAcceptance` explicitly blocks acceptance of eSewa/Khalti orders until `paymentStatus` is `PAID`; the current sentence says the opposite.

### 3.3 Fix the delivery-information sentence

**Current**

> Delivery fees, minimum order values and available areas are shown before checkout.

**Proposed**

> Delivery fees, minimum order values and available areas are shown at checkout before you pay.

**Reason:** The checkout, not a pre-checkout page, displays these amounts. The current wording is a small but avoidable inaccuracy.

### 3.4 Add an AI-assistant clause

**Proposed new section, after “Allergies and dietary needs”**

> **Maya and automated responses**
>
> Maya is an automated assistant intended to help with general questions. It may give incomplete, outdated or incorrect information, including about ingredients, allergens, availability, prices or timing. It is not a substitute for confirmation from our team. For allergies, medical concerns, payment problems, complaints or urgent matters, call us using the number on this site. Do not use Maya to send passwords, wallet credentials, card numbers or other sensitive information.

**Reason:** The assistant is presented as “Maya” but no terms or disclaimer currently explain its limits.

### 3.5 Optional: clarify customer-fault delivery outcomes

The current Terms say an order may “not be refundable” if the customer cannot be reached or the address is wrong. The Refund Policy says if *we* cannot deliver, we will arrange a replacement or refund. These can be reconciled, but the policy should distinguish fault:

> If we cannot deliver because of our own error, an unavailable item or a service area we accepted, we will offer an appropriate replacement or refund for the affected items and any delivery/service charge attributable to that failure. If delivery fails because the customer is unreachable, refuses the order or provided an incomplete/incorrect address, the food may be non-refundable because it has already been prepared and transported; we will explain the outcome and consider a goodwill remedy where appropriate.

**Decision required:** the owner must confirm this is the intended commercial policy.

## 4. Proposed Refund & Cancellation Policy changes

### 4.1 Remove any implication of automatic provider reversal

**Current**

> eSewa and Khalti payments are reversed to the original wallet after the transaction is verified. Provider processing usually takes 24–48 business hours, but can take longer during provider delays.

**Proposed**

> Where a refund is approved, we return it through the original payment channel wherever possible. Our team completes the provider-side reversal or, for cash orders, the agreed bank/wallet transfer or store credit. We will provide a reference once the refund has been submitted. Provider processing can take 24–48 business hours or longer; that timing is outside our control.

**Reason:** There is no eSewa/Khalti refund API in the application. The admin action records a refund after a human completes it manually. The policy should not imply an automatic reversal.

### 4.2 Reconcile undeliverable prepaid orders

Add a fault-based paragraph using the Terms wording in section 3.5, or use the following:

> If we cancel a prepaid order because we cannot fulfil it, the item is unavailable, or we cannot deliver to an area we accepted, we will refund the affected food items and any delivery or service charge attributable to our failure. If we cannot hand over an order because the customer is unreachable, refuses it or gave an incomplete address, the food may be non-refundable; we will explain the reason and any goodwill option.

**Decision required:** whether delivery fees are refunded in customer-fault cases; whether store credit is offered; who approves goodwill.

### 4.3 Keep 30-minute reporting? Confirm operationally

The policy asks customers to report missing/damaged items within 30 minutes of delivery. The code does not enforce this; it is a manual policy. Confirm the owner can consistently honour it, especially for late-night deliveries. If not, change to “as soon as possible and normally within 30 minutes.”

## 5. Proposed Delivery & Shipping Policy changes

### 5.1 Remove the free-delivery claim

**Current**

> Free-delivery thresholds, where available, are also shown at checkout.

**Proposed**

> Delivery fees and minimum order values depend on the selected zone and are shown at checkout. We do not currently advertise a free-delivery threshold; if we introduce one, it will be shown at checkout.

**Reason:** No free-delivery threshold exists in the checkout or database logic.

### 5.2 Align the delivery estimate

**Current**

> A typical delivery takes around 30–45 minutes, but the estimate shown at checkout is more accurate for your selected items and zone.

**Proposed**

> The delivery estimate shown at checkout applies to your selected items and zone. Preparation and travel can take longer during peak hours, large orders, rain, traffic or road closures.

**Reason:** Checkout displays 25–35 minutes for a non-empty cart, while this policy and the FAQ say 30–45. Either align the checkout value or remove the fixed range. Do not state a range that differs from the checkout.

### 5.3 Clarify the prepaid handoff consequence

**Current**

> Prepaid orders that cannot be handed over may not be fully refundable because the food has already been prepared and transported.

**Proposed**

> If a prepaid order cannot be handed over because repeated calls go unanswered or the address is incomplete, the food may not be fully refundable because it has already been prepared and transported. We will explain what was deducted and whether any goodwill remedy is available. This does not limit any refund that applies when the failure was ours.

**Reason:** This preserves the customer-fault rule while making clear it does not override restaurant-fault refunds.

## 6. Proposed FAQ changes

Change the delivery-time answer:

> Most deliveries are estimated at the time shown at checkout, but preparation and travel time depend on the dishes, zone, weather and kitchen demand. The checkout estimate is the best guide for your order.

Change the refund answer:

> Where a refund is approved, we return it through eSewa or Khalti after verification. Cash refunds may be made by bank or wallet transfer, or as store credit by agreement. We will provide a reference once the refund is submitted; provider processing can take 24–48 business hours or longer.

Change the newsletter/footer copy after a real unsubscribe mechanism exists. Until then, avoid “Unsubscribe anytime” and use:

> Occasional menus, events and offers. Ask us to remove you at any time.

## 7. Missing Cookie/Local Storage Policy

There is no separate cookie policy in `LEGAL_LINKS`. If the owner wants one, the minimum accurate categories are:

| Category | Examples in this site | Purpose | Can it be blocked? |
|---|---|---|---|
| Strictly necessary | Auth.js session/CSRF cookies; checkout/session state | Sign-in, security, checkout | No, without breaking the service |
| Functional local storage | Theme preference; shopping cart | Remember choices | Yes, but cart/theme may reset |
| PWA cache | Public marketing pages only; private/order/print/auth pages excluded | Offline/performance | Yes, by clearing site data |
| Third-party embed | Google Maps; Maya assistant iframe; eSewa/Khalti checkout | Map, voice assistant, payment | Yes, but the feature may not work |
| First-party analytics/advertising | None found | — | — |

Do not list specific cookie names or expiry periods until they have been verified in a browser. The service worker currently caches only an allowlist of public pages; order, print, account, checkout, login, reset and verification pages are excluded.

## 8. Newsletter and marketing

Before sending any marketing email:

1. Add double opt-in (confirmation email before `isActive: true`).
2. Add a signed unsubscribe token/route, or a documented manual removal process that is actually monitored.
3. Add `List-Unsubscribe` / `List-Unsubscribe-Post` headers if the provider supports them.
4. Record consent source and timestamp.
5. Remove “Unsubscribe anytime” until step 2 is live.

The current action immediately activates any submitted address, so someone can subscribe another person without confirmation.

## 9. Operational/legal launch blockers outside the policy text

These are not copy changes, but they affect whether the published promises are true:

- **Sandbox payments in production.** The live menu is populated, the site says “Accepting orders,” and checkout reports `paymentMode: "sandbox"` with eSewa and Khalti both enabled. The temporary test window ends `2026-10-28T18:14:59.000Z`. Disable online payment or pause ordering until live payment is configured. Test wallets can otherwise create real food orders that look paid.
- **Email sender domain.** Production `EMAIL_FROM` is on `resend.dev`, not a verified restaurant domain. Resend’s shared test domain generally delivers only to the account owner. New password/email-verification messages may therefore fail for customers. Verify a domain and send a real external test before launch.
- **Maya embed allowlist.** The assistant’s `frame-ancestors` header currently allows `purplehaze-nine.vercel.app`, `purplehaze.com.np`, and localhost. Add any preview or `www` host there before relying on the assistant on that domain.
- **Maya recording/retention.** Confirm the Maya module’s recording/transcript settings and data-processing terms before describing them.
- **Google Maps cookies.** If the business wants a consent-first experience, replace the automatic iframe with a click-to-load map. Otherwise disclose the embed and Google’s role.

## 10. Suggested publication sequence

1. Owner answers section 1.
2. Legal adviser reviews the final Nepali/English wording, especially consumer-refund, privacy-consent and cross-border points.
3. Apply the approved copy to the pages and `LEGAL_LINKS`.
4. Add a Cookie/Local Storage Policy if counsel wants a separate page.
5. Update `LEGAL_UPDATED` only on publication.
6. Re-test checkout, email, Maya and Google Maps after the copy changes.

---

**Limitations:** This document is a factual reconciliation against the current code, not a legal opinion. It does not decide whether the business is compliant with the Nepal Privacy Act, consumer-protection rules, electronic-transaction rules or any other law. Those decisions require a qualified adviser and the owner’s commercial choices.
