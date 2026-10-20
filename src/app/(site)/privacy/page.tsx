import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Purple Haze Restro & Garden collects, uses and protects personal information for orders, reservations, events and website messages.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    title: "1. Who we are",
    body: [
      "Purple Haze Restro & Garden operates this website and the restaurant at Airport Road, Biratnagar 56613, Nepal. For privacy questions, contact us using the details at the bottom of this page.",
      "This policy explains the personal information we collect through the website, why we use it, and the choices available to you.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "Account information: name, email address, phone number, password (stored as a secure hash), profile photo and saved delivery addresses.",
      "Order information: items, prices, order type, delivery address, table number, notes, scheduled time, payment method and payment status. We do not store full card details or wallet passwords.",
      "Booking information: name, contact details, event or reservation date, guest count, occasion, venue preference and notes.",
      "Messages and reviews: the content you submit, your name and contact details, and moderation status.",
      "Technical information: IP address and basic request data used for security, rate limiting and fraud prevention. Our hosting and infrastructure providers may also process standard server logs.",
      "Marketing information: your email address if you choose to join our newsletter, and whether you open or interact with marketing email where supported.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "To prepare, fulfil and communicate about food orders; process payments; arrange delivery or pickup; and handle cancellations, refunds and reviews.",
      "To respond to reservations, event enquiries, contact messages and accessibility requests.",
      "To create and secure accounts, verify email addresses, reset passwords and prevent misuse.",
      "To send transactional messages such as order confirmations, status updates and booking replies. These are not marketing.",
      "To send newsletter emails if you subscribed. You can unsubscribe at any time using the link in the email or by contacting us.",
      "To maintain records, produce internal reports, improve the menu and service, and meet legal or accounting obligations.",
    ],
  },
  {
    title: "4. Legal bases and consent",
    body: [
      "We process information to perform a contract with you (for example, fulfilling an order), to take steps at your request before a booking, to comply with legal obligations, for legitimate business interests such as security and record-keeping, and with your consent where required (for example, optional marketing email).",
      "You can withdraw consent for marketing at any time. Withdrawing consent does not affect processing that already happened or processing based on another lawful basis.",
    ],
  },
  {
    title: "5. Payments",
    body: [
      "Cash payments are handled at the restaurant. Online payments are processed by eSewa and Khalti. When you choose an online method, you are redirected to the provider's own page and their privacy policy applies.",
      "We receive confirmation of payment status and a transaction reference. We do not receive or store your wallet password or full financial credentials.",
    ],
  },
  {
    title: "6. Service providers and sharing",
    body: [
      "We use service providers for website hosting, database storage, email delivery, file/image hosting, rate limiting and payment processing. They process information only as needed to provide those services.",
      "We may disclose information where required by law, to protect the rights and safety of guests or staff, or in connection with a business restructuring. We do not sell personal information.",
      "If you choose Google sign-in, Google provides your name, email address and profile image according to your Google settings. Our use of that information is covered by this policy.",
    ],
  },
  {
    title: "7. Retention",
    body: [
      "Order, payment and booking records are kept for as long as needed to run the restaurant, handle refunds and disputes, and meet accounting or legal requirements.",
      "Account information is kept while your account is active. You can ask us to delete your account; some order records may be retained in a minimal form where required by law or for fraud prevention.",
      "Contact messages and reviews are kept only as long as needed to handle the enquiry, maintain moderation records and improve the service. Newsletter data is kept until you unsubscribe or ask for deletion.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We use password hashing, authenticated sessions, role checks, rate limits and encrypted connections in production. No system is completely secure, so please choose a strong unique password and tell us promptly if you suspect unauthorised access.",
      "Staff access is limited by role. Administrative actions are recorded in an audit log.",
    ],
  },
  {
    title: "9. Your choices and rights",
    body: [
      "Subject to applicable law, you may request access to the personal information we hold about you, ask for correction or deletion, withdraw marketing consent, or raise a concern about how we handle your data.",
      "You can update your name, phone, photo, password and addresses from your account settings. To make another request, contact us. We may need to verify your identity first.",
    ],
  },
  {
    title: "10. Cookies and local storage",
    body: [
      "We use essential cookies for sign-in and security. The website also uses browser local storage to remember your theme preference and shopping cart.",
      "We do not currently use advertising cookies. If analytics or advertising tools are added, this policy will be updated and consent will be requested where required.",
    ],
  },
  {
    title: "11. Children",
    body: [
      "The website is not intended for children to use independently. Orders and bookings should be made by an adult. If a child's information is submitted by a parent or guardian for a family booking, it is handled under this policy.",
    ],
  },
  {
    title: "12. Changes and contact",
    body: [
      "We may update this policy as the service changes. The date at the top shows the latest version. Material changes will be highlighted where practical.",
      "For privacy requests or questions, contact the restaurant using the details below. If you are not satisfied, you may raise the matter with the relevant authority in Nepal.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section className="container-page max-w-4xl py-14 lg:py-20">
      <p className="eyebrow">Your information</p>
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
        Privacy policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: 19 October 2026
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-5 text-sm leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">Owner review note</p>
        <p className="mt-1">
          This notice describes how the website is designed to handle data. The
          owner should confirm the final retention periods, business registration
          details and any local registration obligations with an adviser before
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
          <Link href="/terms" className="text-primary underline">
            terms and ordering policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
