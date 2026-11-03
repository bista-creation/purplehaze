import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { SITE } from "@/lib/constants";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Purple Haze Restro & Garden collects, uses, stores and protects personal information for orders, reservations, events and website messages.",
  alternates: { canonical: "/privacy-policy" },
};

const sections: LegalSection[] = [
  {
    title: "1. Who we are",
    body: [
      `${SITE.name} operates this website and the restaurant at ${SITE.address.line1}, ${SITE.address.line2}, ${SITE.address.state}, ${SITE.address.country}.`,
      "This policy explains the personal information we collect through the website, why we use it, how long we keep it, and the choices available to you.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "We collect information you provide directly, information created when you place an order or make a booking, and limited technical information needed to run and secure the website.",
    ],
    bullets: [
      "Account information: name, email address, phone number, password hash, profile photo and saved delivery addresses.",
      "Order information: items, prices, order type, delivery address, table number, notes, scheduled time, payment method and payment status.",
      "Delivery and Rider GPS Location: When an order is actively out for delivery, real-time GPS coordinates (latitude and longitude) are gathered from the assigned rider's mobile device solely to display live transit progress to the customer and dispatch board. Speed, heading, and device motion data are stripped at ingestion. GPS coordinates are retained ephemerally in cache with a 120-second time-to-live (TTL) and are permanently purged the moment the delivery is completed, cancelled, or failed. Historical GPS routes and breadcrumbs are never stored in permanent database records.",
      "Booking information: name, contact details, reservation or event date, guest count, occasion, venue preference and notes.",
      "Messages and reviews: the content you submit, your name, contact details and moderation status.",
      "Technical information: IP address, browser type, basic request data and session timestamps used for security, rate limiting and fraud prevention.",
      "Marketing information: your email address if you join our newsletter, and limited interaction data where supported.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "We use personal information only for legitimate restaurant and website operations, including the purposes below.",
    ],
    bullets: [
      "To prepare, fulfil and communicate about food orders, payments, delivery, pickup and dine-in service.",
      "To provide live delivery tracking to customers and kitchen dispatchers while orders are out for delivery.",
      "To manage reservations, event enquiries, contact messages, accessibility requests and complaints.",
      "To create and secure accounts, verify email addresses, reset passwords and prevent misuse.",
      "To send transactional messages such as order confirmations, status updates and booking replies.",
      "To send newsletter emails where you subscribed. You can unsubscribe at any time.",
      "To maintain business records, improve our menu and service, and meet legal or accounting obligations.",
    ],
  },
  {
    title: "4. Payments and financial data",
    body: [
      "Cash payments are handled at the restaurant or on delivery. Online payments are processed by eSewa and Khalti when those options are enabled.",
      "When you choose an online payment method, you are redirected to the provider's own checkout. We receive confirmation of payment status and a transaction reference. We do not receive or store your wallet password, MPIN, card number or full financial credentials.",
    ],
  },
  {
    title: "5. Cookies and local storage",
    body: [
      "We use essential cookies for sign-in, security and checkout. The website also uses browser local storage to remember your theme preference and shopping cart.",
      "We do not currently use advertising cookies. If analytics or advertising tools are added, this policy will be updated and consent will be requested where required.",
    ],
  },
  {
    title: "6. Sharing and service providers",
    body: [
      "We do not sell or rent personal information. We share it only where needed to run the service or where the law requires it.",
    ],
    bullets: [
      "Hosting, database, email delivery, image hosting, rate limiting and payment providers that process information on our behalf.",
      "Delivery riders, who receive the delivery address and contact number needed to complete an order.",
      "Customers receiving an active delivery, who can see the approximate real-time GPS location of their assigned rider until the order is handed over.",
      "Google, if you choose Google sign-in, which provides your name, email address and profile image according to your Google settings.",
      "Government authorities or regulators where disclosure is required by applicable law, or where needed to protect the rights and safety of guests or staff.",
    ],
  },
  {
    title: "7. Retention",
    body: [
      "Order, payment and booking records are kept for as long as needed to run the restaurant, handle refunds and disputes, and meet accounting or legal requirements.",
      "Account information is kept while your account is active. You can ask us to delete your account; some order records may be retained in a minimal form where required by law or for fraud prevention.",
      "Ephemeral rider GPS coordinates are never permanently stored and are evicted immediately upon delivery completion or within 120 seconds of cessation of transit.",
      "Delivery proof-of-delivery photos (where captured) are retained in private storage for up to 30 days for dispute resolution before scheduled automatic deletion.",
      "Contact messages, reviews and newsletter data are kept only as long as needed for the purpose they were collected, or until you ask for deletion where applicable.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We use password hashing, authenticated sessions, role checks, rate limits and encrypted connections in production. Staff access is limited by role, and administrative actions are recorded in an audit log.",
      "No system is completely secure. Please choose a strong, unique password and tell us promptly if you suspect unauthorised access to your account.",
    ],
  },
  {
    title: "9. Your rights and choices",
    body: [
      "Subject to applicable Nepali law, you may request access to the personal information we hold about you, ask for correction or deletion, withdraw marketing consent, or raise a concern about how we handle your data.",
      "You can update your name, phone, photo, password and addresses from your account settings. For other requests, contact us using the details below. We may need to verify your identity first.",
    ],
  },
  {
    title: "10. Children",
    body: [
      "The website is not intended for children to use independently. Orders and bookings should be made by an adult. If a child's information is submitted by a parent or guardian for a family booking, it is handled under this policy.",
    ],
  },
  {
    title: "11. Changes to this policy",
    body: [
      "We may update this policy as the service changes. The date at the top shows the latest version. Material changes will be highlighted where practical.",
    ],
  },
  {
    title: "12. Contact and grievances",
    body: [
      "For privacy requests or questions, contact the restaurant using the details below. If you are not satisfied with our response, you may raise the matter with the relevant authority in Nepal.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      current="/privacy-policy"
      eyebrow="Your information"
      title="Privacy Policy"
      intro="Your privacy and trust matter to us. This policy explains what information Purple Haze collects, why we need it, and how you can control it."
      updated={LEGAL_UPDATED}
      sections={sections}
    />
  );
}
