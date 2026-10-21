import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { GrievanceDesk } from "@/components/legal/grievance-desk";
import { LegalPage } from "@/components/legal/legal-page";
import { SITE } from "@/lib/constants";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "FAQs & Help Center",
  description:
    "Answers about online ordering, payments, delivery, reservations, events and complaints at Purple Haze Restro & Garden.",
  alternates: { canonical: "/faq" },
};

const faqGroups = [
  {
    title: "Ordering & payments",
    items: [
      {
        question: "How do I place an online food order?",
        answer:
          "Browse the menu, add dishes to your cart and open checkout. Choose delivery, pickup or dine-in, enter your details and select a payment method. After you place the order, keep the order number and order page link so you can follow its status.",
      },
      {
        question: "Which payment methods do you accept?",
        answer:
          "We accept cash on delivery where enabled, plus eSewa and Khalti when those options are available at checkout. The options shown at checkout apply to your order and location.",
      },
      {
        question: "Is an online payment safe?",
        answer:
          "Online payments are completed on the payment provider's own checkout. We receive the payment status and a transaction reference, but we do not store your wallet password, MPIN or card number. We verify the payment with the provider before marking an order paid.",
      },
      {
        question: "Why is my order still showing as unpaid?",
        answer:
          "A payment can take a short time to confirm, or it may have been interrupted. Do not pay a second time. Open your order page and use the payment check option, or call us with the order number and transaction reference so we can verify it.",
      },
      {
        question: "Can I cancel an order?",
        answer:
          "You can cancel from the order page while the status is Pending or Confirmed. Once the kitchen has started preparing the food, call us immediately; cancellation may no longer be possible. See the Refund & Cancellation Policy for details.",
      },
    ],
  },
  {
    title: "Delivery & refunds",
    items: [
      {
        question: "Where do you deliver and what are the fees?",
        answer:
          "We deliver in Biratnagar and nearby service areas. The available zones, delivery fees and minimum order values are shown at checkout after you enter your address. If your area is not listed, call us to check whether pickup or a special arrangement is possible.",
      },
      {
        question: "How long does delivery take?",
        answer:
          "Most deliveries are estimated at around 30–45 minutes, but preparation and travel time depend on the dishes, zone, weather and kitchen demand. The estimate at checkout is the best guide for your order.",
      },
      {
        question: "What if an item is missing or damaged?",
        answer:
          "Contact us within 30 minutes of delivery and keep the packaging and affected food available. Send your order number and a photo if possible. We will review the issue and arrange a replacement or refund for the affected item.",
      },
      {
        question: "How are refunds processed?",
        answer:
          "Approved online refunds are returned through eSewa or Khalti after verification. Cash refunds may be made by bank or wallet transfer, or as store credit by agreement. Provider processing usually takes 24–48 business hours, but can take longer.",
      },
    ],
  },
  {
    title: "Reservations, events & dietary needs",
    items: [
      {
        question: "Do I need to reserve a table in advance?",
        answer:
          "Reservations are recommended for weekends, larger groups and special occasions. Send a reservation request through the website or call us. A request is confirmed only when our team confirms it with you.",
      },
      {
        question: "Can I book a banquet hall or the garden for an event?",
        answer:
          "Yes. Send an event enquiry with your preferred date, guest count and occasion. Our team will contact you to discuss the venue, menu, deposit and any written booking terms.",
      },
      {
        question: "Do you handle allergies and dietary requirements?",
        answer:
          "Our kitchen handles nuts, dairy, gluten, eggs, fish, shellfish, soy, sesame and other allergens, so we cannot guarantee an allergen-free environment. If you have a serious allergy, call us before ordering rather than relying only on an online note.",
      },
    ],
  },
  {
    title: "Account & help",
    items: [
      {
        question: "How do I track my order?",
        answer:
          "Use the order page link shown after checkout, or open the order tracker and enter the order number plus the phone number used at checkout. Keep the order link private because it provides access to your order details.",
      },
      {
        question: "How do I change my account details or delete my data?",
        answer:
          "You can update your name, phone, photo, password and saved addresses from your account settings. For a data access, correction or deletion request, contact us using the details below. See the Privacy Policy for how we handle personal information.",
      },
      {
        question: "Who do I contact if my complaint is not resolved?",
        answer:
          "Use the Grievance & Contact Desk below. Include your order or booking reference and a short description of what happened. The grievance officer will review the matter and respond within the stated target.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <LegalPage
      current="/faq"
      eyebrow="Help center"
      title="FAQs & Help Center"
      intro="Quick answers about ordering, payments, delivery, reservations, events and complaints. If your question is not here, contact our team."
      updated={LEGAL_UPDATED}
    >
      <div className="space-y-9">
        {faqGroups.map((group) => (
          <section key={group.title}>
            <h2 className="font-display text-2xl font-semibold">
              {group.title}
            </h2>
            <div className="mt-4 space-y-2.5">
              {group.items.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-border bg-card px-4 py-3 open:border-primary/30 open:bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <ChevronDown className="size-4 shrink-0 text-primary transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-7 text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-9 rounded-2xl border border-border bg-secondary/40 p-5 text-sm leading-7 text-muted-foreground">
        <p className="font-semibold text-foreground">Still need help?</p>
        <p className="mt-1">
          Call{" "}
          <a href={`tel:${SITE.phoneRaw}`} className="text-primary">
            {SITE.phone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${SITE.email}`} className="break-all text-primary">
            {SITE.email}
          </a>
          . You can also read the{" "}
          <Link
            href="/refund-and-cancellation"
            className="text-primary underline underline-offset-4"
          >
            Refund &amp; Cancellation Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/shipping-and-delivery"
            className="text-primary underline underline-offset-4"
          >
            Delivery &amp; Shipping Policy
          </Link>
          .
        </p>
      </div>

      <div className="mt-9">
        <GrievanceDesk />
      </div>
    </LegalPage>
  );
}
