import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Delivery & Shipping Policy",
  description:
    "Delivery areas, fees, preparation times, packaging and handoff guidelines for orders from Purple Haze Restro & Garden in Biratnagar.",
  alternates: { canonical: "/shipping-and-delivery" },
};

const sections: LegalSection[] = [
  {
    title: "1. Delivery areas",
    body: [
      "We deliver in Biratnagar and nearby service areas. The delivery zones available for your address are shown at checkout. If your area is not listed, call us before ordering to check whether we can arrange delivery or pickup.",
      "Delivery availability can change during peak hours, bad weather or periods of high demand. If we cannot deliver an accepted order, we will contact you to arrange pickup, reschedule or refund it.",
    ],
  },
  {
    title: "2. Fees, minimum orders and free delivery",
    body: [
      "Delivery fees and minimum order values depend on the selected zone. The amount that applies to your order is shown before you pay. Free-delivery thresholds, where available, are also shown at checkout.",
      "Menu prices and delivery fees are in Nepali rupees. If a fee or minimum order changes after you open the checkout, refresh the page before placing the order.",
    ],
  },
  {
    title: "3. Preparation and delivery time",
    body: [
      "Every dish is prepared fresh after you order. A typical delivery takes around 30–45 minutes, but the estimate shown at checkout is more accurate for your selected items and zone.",
      "Peak evening hours, large orders, rain, traffic and road closures can extend the delivery time. If we expect a significant delay, our team will try to contact you using the phone number on the order.",
    ],
  },
  {
    title: "4. Packaging and food safety",
    body: [
      "Food is packed in food-grade containers suitable for the dish. Hot items are kept separate from chilled items where possible, and bags are sealed before they leave the kitchen.",
      "If a seal is broken, a container is leaking badly, or the package looks tampered with when it arrives, refuse the delivery and call us immediately. Do not consume food from a package that appears unsafe.",
    ],
  },
  {
    title: "5. Handoff and recipient availability",
    body: [
      "Please provide a phone number that the rider can reach and a complete address with a landmark or building name. Our rider will wait for a reasonable time while attempting to reach you.",
      "If repeated calls go unanswered, the order may be returned to the restaurant. Prepaid orders that cannot be handed over may not be fully refundable because the food has already been prepared and transported.",
      "For cash on delivery, please keep the amount ready. If you have a delivery note or gate instruction, add it during checkout or tell the rider when they call.",
    ],
  },
  {
    title: "6. Order tracking",
    body: [
      "After checkout, you receive an order number and a link to the order page. Use that page to follow confirmation, kitchen preparation, dispatch and delivery updates. Keep the order link private because it contains access to your order details.",
    ],
  },
  {
    title: "7. Bulk orders and catering",
    body: [
      "Large catering, banquet and off-site event orders need advance planning. Contact us before ordering so we can confirm the menu, quantity, delivery time, packaging and any service requirements.",
      "Bulk orders may require a deposit and a confirmed headcount. Delivery outside our normal zones can be arranged for catering and event packages by prior agreement.",
    ],
  },
  {
    title: "8. Delivery help",
    body: [
      "For an active delivery, call the restaurant using the number below and have your order number ready. For damaged or missing items, see our Refund & Cancellation Policy and contact us within 30 minutes of delivery.",
    ],
  },
];

export default function ShippingAndDeliveryPage() {
  return (
    <LegalPage
      current="/shipping-and-delivery"
      eyebrow="From our kitchen to you"
      title="Delivery & Shipping Policy"
      intro="How delivery zones, fees, preparation times and handoff work for orders from Purple Haze Restro & Garden."
      updated={LEGAL_UPDATED}
      sections={sections}
    />
  );
}
