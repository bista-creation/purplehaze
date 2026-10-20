import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms & ordering policy",
  description:
    "Terms for ordering food, making reservations and booking events at Purple Haze Restro & Garden, Biratnagar.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "1. About these terms",
    body: [
      "These terms apply when you use the Purple Haze Restro & Garden website, place a food order, request a reservation or send an event enquiry. By using the site or placing an order you agree to them.",
      "The restaurant is located at Airport Road, Biratnagar 56613, Koshi Province, Nepal. You can contact us using the details at the bottom of this page.",
    ],
  },
  {
    title: "2. Menu, prices and availability",
    body: [
      "Menu items, prices and availability can change. The price shown at checkout is the amount that applies to that order. All amounts are in Nepali rupees (NPR) and include applicable taxes where stated.",
      "Photographs are illustrative. Plating, portions and ingredients may vary. If an item becomes unavailable after you order, our team will contact you to agree a replacement or remove it.",
    ],
  },
  {
    title: "3. Placing and accepting orders",
    body: [
      "Submitting an order creates a request that our team confirms. We may contact you by phone or email if we need to clarify an address, allergen, table number or item.",
      "You must provide a valid phone number and, for delivery, a complete address and delivery area. Orders for dine-in require a table number, or our team can help assign one.",
      "We may decline or cancel an order where payment fails, information is incomplete, an item is unavailable, or we reasonably believe the request is fraudulent or abusive.",
    ],
  },
  {
    title: "4. Delivery, pickup and dine-in",
    body: [
      "Delivery times are estimates and can be affected by weather, traffic and kitchen demand. Delivery fees and minimum order values are shown before checkout and depend on the selected area.",
      "For pickup, please collect within the time communicated by our team. For dine-in, food is prepared for the table number you provide.",
    ],
  },
  {
    title: "5. Payments and refunds",
    body: [
      "We accept cash on delivery, eSewa and Khalti where enabled. Online payments are processed by the relevant payment provider. We do not store your payment card or wallet password.",
      "If an online payment is duplicated, charged incorrectly or an order is cancelled after payment, contact us. Eligible refunds are reviewed and processed manually through the original payment provider. Bank or wallet processing times are outside our control.",
      "The local development build may run a clearly marked sandbox payment mode. No real money moves in sandbox mode.",
    ],
  },
  {
    title: "6. Cancellations and changes",
    body: [
      "You can cancel an order from its order page while its status is Pending or Confirmed. Once the kitchen begins preparing, changes and cancellations require a phone call and may not be possible.",
      "Reservation and event enquiries are requests. A reservation is confirmed only when our team says so. Event bookings may require a separate written agreement covering menus, deposits, guest counts and cancellation dates.",
    ],
  },
  {
    title: "7. Allergies and dietary needs",
    body: [
      "Our kitchen handles nuts, dairy, gluten, eggs, fish, shellfish, soy, sesame and other allergens. We cannot guarantee an allergen-free environment.",
      "If you have a serious allergy, contact us by phone before ordering. Notes entered online are passed to the kitchen but are not a substitute for a direct conversation.",
    ],
  },
  {
    title: "8. Reviews and user content",
    body: [
      "Reviews may be moderated before publication. By submitting a review or message, you confirm that it is your own honest experience and that you have the right to share it. We may remove content that is unlawful, abusive, misleading or contains personal information.",
      "We may use published reviews on the website and social channels. You can ask us to remove your review by contacting us.",
    ],
  },
  {
    title: "9. Website use and intellectual property",
    body: [
      "The Purple Haze name, website design, copy and photographs may not be copied or used commercially without permission. You agree not to attempt to disrupt the site, access another person's account, scrape data or misuse the ordering system.",
      "Third-party links, maps and payment pages are governed by their own terms.",
    ],
  },
  {
    title: "10. Liability and governing law",
    body: [
      "We take care in preparing food and running the website, but we do not exclude liability that cannot lawfully be excluded. To the extent permitted by law, our responsibility for an order is limited to the amount paid for that order.",
      "These terms are governed by the laws of Nepal. Any dispute should first be raised with us so we can try to resolve it.",
    ],
  },
  {
    title: "11. Changes to these terms",
    body: [
      "We may update these terms as the service changes. The version published on this page applies from the date shown. Material changes will be highlighted where practical.",
    ],
  },
];

export default function TermsPage() {
  return (
    <section className="container-page max-w-4xl py-14 lg:py-20">
      <p className="eyebrow">The practical details</p>
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
        Terms &amp; ordering policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: 19 October 2026
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-5 text-sm leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">Owner review note</p>
        <p className="mt-1">
          This policy is a clear starting point for the website. The restaurant
          owner should confirm the final cancellation, refund and event-deposit
          rules, and have the document reviewed by a Nepali legal adviser before
          launch.
        </p>
      </div>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl font-semibold">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 text-sm leading-7 text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-5 text-sm leading-7">
        <h2 className="font-display text-xl font-semibold">Contact us</h2>
        <p className="mt-2 text-muted-foreground">
          {SITE.name}
          <br />
          {SITE.address.line1}, {SITE.address.line2}
          <br />
          <a href={`tel:${SITE.phoneRaw}`} className="text-primary">
            {SITE.phone}
          </a>{" "}
          ·{" "}
          <a href={`mailto:${SITE.email}`} className="break-all text-primary">
            {SITE.email}
          </a>
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          See also our{" "}
          <Link href="/privacy" className="text-primary underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
