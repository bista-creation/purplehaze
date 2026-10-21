import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "How cancellations, missing or incorrect items, damaged deliveries and payment reversals are handled at Purple Haze Restro & Garden.",
  alternates: { canonical: "/refund-and-cancellation" },
};

const sections: LegalSection[] = [
  {
    title: "1. Order cancellations",
    body: [
      "You can cancel an order from its order page while the order status is Pending or Confirmed. If you cannot access the order page, call us as soon as possible.",
      "Once our kitchen has started preparing your food, cancellation may not be possible because dishes are cooked fresh to order. If we can stop preparation, we will tell you; if we cannot, the order may remain payable.",
      "If we cancel an order because an item is unavailable, we cannot safely fulfil it, or we cannot deliver to the address provided, we will contact you and arrange an appropriate replacement or refund.",
    ],
  },
  {
    title: "2. Missing, incorrect or damaged items",
    body: [
      "Please check your order when it arrives. If an item is missing, incorrect, spilled or visibly damaged, contact us within 30 minutes of delivery and keep the packaging and food available for inspection.",
      "Send your order number and, where possible, a photo of the affected item to our contact desk. We will arrange a replacement or a refund for the affected item after reviewing the issue. Please do not discard the item before we respond.",
    ],
  },
  {
    title: "3. Refund methods and timelines",
    body: [
      "Approved refunds are returned through the original payment channel wherever possible.",
    ],
    bullets: [
      "eSewa and Khalti payments are reversed to the original wallet after the transaction is verified. Provider processing usually takes 24–48 business hours, but can take longer during provider delays.",
      "Cash on delivery orders may be refunded by bank transfer, mobile wallet transfer or a Purple Haze store credit, as agreed with you.",
      "Delivery fees and service charges may be refunded when the fault was ours. They are not normally refunded when the order was correctly delivered.",
      "Bank, wallet and payment-provider processing times are outside our control. We will provide a reference once a refund has been submitted.",
    ],
  },
  {
    title: "4. Duplicate or failed payments",
    body: [
      "If your wallet or bank account was debited more than once, or a payment was taken but the order did not confirm, contact us with the order number, payment method and transaction reference. Do not make a second payment until we have checked the status.",
      "We verify duplicate or failed transactions with the payment provider before approving a reversal. If a payment is still pending at the provider, it may settle or reverse automatically.",
    ],
  },
  {
    title: "5. Reservations and event bookings",
    body: [
      "Table reservations can be cancelled or rescheduled without a cancellation fee. Please tell us as early as possible so the table can be released for other guests.",
      "Event and banquet bookings may require a deposit and a separate written agreement. Deposit amounts, cancellation notice periods and refund eligibility are set out in that agreement. Please contact our events team before cancelling or changing a confirmed booking.",
    ],
  },
  {
    title: "6. How to request a refund",
    body: [
      "Contact us with your order number or booking reference, the payment method, the amount and a short description of the issue. Photos and provider transaction references help us resolve the request faster.",
      "Our team will confirm whether the request is approved and explain the next step. If you are not satisfied with the response, you can escalate the matter to our grievance officer using the contact desk below.",
    ],
  },
];

export default function RefundAndCancellationPage() {
  return (
    <LegalPage
      current="/refund-and-cancellation"
      eyebrow="Fair and transparent"
      title="Refund & Cancellation Policy"
      intro="Food is prepared fresh to order, so timing matters. This policy explains when an order can be cancelled, when a refund is available, and how reversals are processed."
      updated={LEGAL_UPDATED}
      sections={sections}
    />
  );
}
