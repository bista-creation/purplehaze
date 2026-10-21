import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { SITE } from "@/lib/constants";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms for ordering food, making reservations, booking events and using the Purple Haze Restro & Garden website.",
  alternates: { canonical: "/terms-and-conditions" },
};

const sections: LegalSection[] = [
  {
    title: "1. About these terms",
    body: [
      `These terms apply when you use the ${SITE.name} website, place a food order, request a reservation or send an event enquiry. By using the site or placing an order, you agree to them.`,
      `The restaurant is located at ${SITE.address.line1}, ${SITE.address.line2}, ${SITE.address.state}, ${SITE.address.country}. You can contact us using the details at the bottom of this page.`,
    ],
  },
  {
    title: "2. Orders, menu and pricing",
    body: [
      "Menu items, prices and availability can change. The price shown at checkout is the amount that applies to that order. All amounts are in Nepali rupees (NPR) and include applicable taxes where stated.",
      "Photographs are illustrative. Plating, portions and ingredients may vary. If an item becomes unavailable after you order, our team will contact you to agree a replacement or remove it.",
      "Submitting an order creates a request that our team confirms. We may contact you by phone or email if we need to clarify an address, allergen, table number or item. We may decline or cancel an order where payment fails, information is incomplete, an item is unavailable, or we reasonably believe the request is fraudulent or abusive.",
    ],
  },
  {
    title: "3. Payments",
    body: [
      "We accept cash on delivery, eSewa and Khalti where those options are enabled at checkout. Online payments are processed by the relevant payment provider. We do not store your card number, wallet password or MPIN.",
      "Online payment success is verified with the provider before an order is marked paid. A payment status and an order fulfilment status are separate: an order may be accepted while an online payment is still pending, and cash orders may be accepted with cash due on delivery.",
    ],
  },
  {
    title: "4. Delivery, pickup and dine-in",
    body: [
      "Delivery times are estimates and can be affected by weather, traffic and kitchen demand. Delivery fees, minimum order values and available areas are shown before checkout.",
      "For pickup, please collect within the time communicated by our team. For dine-in, food is prepared for the table number you provide.",
      "You must provide a valid phone number and, for delivery, a complete address and delivery area. If we cannot reach you or deliver to the address provided, the order may be returned to the restaurant and may not be refundable.",
    ],
  },
  {
    title: "5. Cancellations and refunds",
    body: [
      "You can cancel an order from its order page while its status is Pending or Confirmed. Once the kitchen begins preparing, changes and cancellations require a phone call and may not be possible because food is prepared fresh to order.",
      "If an online payment is duplicated, charged incorrectly or an order is cancelled after payment, contact us. Eligible refunds are reviewed and processed through the original payment provider. Provider processing times are outside our control.",
      "Our Refund & Cancellation Policy explains eligibility, evidence requirements and refund methods in more detail.",
    ],
  },
  {
    title: "6. Reservations and events",
    body: [
      "Reservation and event enquiries are requests. A reservation is confirmed only when our team says so. Event bookings may require a separate written agreement covering menus, deposits, guest counts, timings and cancellation dates.",
      "Reserved tables may be released if you arrive significantly late without contacting us. Please call ahead if you are delayed.",
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
      "Reviews may be moderated before publication. By submitting a review or message, you confirm that it is your own honest experience and that you have the right to share it. We may remove content that is unlawful, abusive, misleading or contains another person's personal information.",
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
    title: "10. Liability and force majeure",
    body: [
      "We take care in preparing food and running the website, but we do not exclude liability that cannot lawfully be excluded. To the extent permitted by law, our responsibility for an order is limited to the amount paid for that order.",
      "We are not responsible for delays caused by events beyond our reasonable control, including severe weather, flooding, strikes, road closures or power interruptions. We will work with you to reschedule, replace or refund an affected order where appropriate.",
    ],
  },
  {
    title: "11. Governing law and changes",
    body: [
      "These terms are governed by the laws of Nepal. Any dispute should first be raised with us so we can try to resolve it. Unresolved disputes may be brought before the competent courts in Morang District, Biratnagar, Nepal.",
      "We may update these terms as the service changes. The version published on this page applies from the date shown. Material changes will be highlighted where practical.",
    ],
  },
  {
    title: "12. Contact",
    body: [
      "Questions about these terms, an order or a booking can be sent to the restaurant using the contact details below. For a formal complaint, use our grievance and contact desk.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      current="/terms-and-conditions"
      eyebrow="The practical details"
      title="Terms & Conditions"
      intro="Please read these terms before using our website, placing an order, reserving a table or booking an event."
      updated={LEGAL_UPDATED}
      sections={sections}
    />
  );
}
