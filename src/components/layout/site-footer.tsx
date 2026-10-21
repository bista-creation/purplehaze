import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { Separator } from "@/components/ui/separator";
import { PUBLIC_NAV, SITE } from "@/lib/constants";
import { LEGAL_LINKS } from "@/lib/legal";

const exploreLinks = [
  ...PUBLIC_NAV.filter((item) => item.href !== "/"),
  { href: "/reservations", label: "Reservations" },
  { href: "/track", label: "Track an order" },
];

const serviceLinks = [
  { href: "/menu", label: "Order online" },
  { href: "/events", label: "Weddings & receptions" },
  { href: "/events", label: "Corporate meetings" },
  { href: "/contact", label: "Private dining" },
  { href: "/contact#accessibility", label: "Accessibility" },
  { href: "/account/bookings", label: "My bookings" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/4 size-72 rounded-full bg-gold/10 blur-3xl"
        aria-hidden
      />
      <div className="container-page relative py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.7fr_0.8fr_0.9fr_0.95fr] lg:gap-8">
          <div>
            <Logo variant="light" />
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
              A garden restaurant, banquet venue and meeting place on Airport
              Road. Made for everyday meals and once-in-a-lifetime evenings.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={SITE.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Purple Haze on Facebook"
                className="grid size-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-gold hover:text-gold"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 fill-current"
                  aria-hidden
                >
                  <path d="M14 8.5h2.2V5.7c-.4-.1-1.6-.2-3-.2-3 0-5 1.8-5 5.2v2.8H5.5v3.2h2.7V24h3.3v-7.3h2.9l.4-3.2h-3.3v-2.3c0-1.4.4-2.7 2.5-2.7Z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Purple Haze on WhatsApp"
                className="grid size-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-gold hover:text-gold"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href={`mailto:${SITE.email}`}
                aria-label="Email Purple Haze"
                className="grid size-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-gold hover:text-gold"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Explore
            </h2>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/55 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Visit &amp; order
            </h2>
            <ul className="mt-5 space-y-3">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/55 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Policies &amp; Legal
            </h2>
            <ul className="mt-5 space-y-3">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/55 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Find us
            </h2>
            <address className="mt-5 space-y-4 not-italic">
              <a
                href={SITE.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 text-sm leading-relaxed text-white/55 transition hover:text-white"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  {SITE.address.line1}
                  <br />
                  {SITE.address.line2}, {SITE.address.country}
                </span>
              </a>
              <a
                href={`tel:${SITE.phoneRaw}`}
                className="flex items-center gap-3 text-sm text-white/55 transition hover:text-white"
              >
                <Phone className="size-4 shrink-0 text-gold" />
                {SITE.phone}
              </a>
              <a
                href={`mailto:${SITE.email}`}
                className="flex items-start gap-3 text-sm text-white/55 transition hover:text-white"
              >
                <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
                <span className="min-w-0 break-all">{SITE.email}</span>
              </a>
              <p className="flex items-center gap-3 text-sm text-white/55">
                <Clock className="size-4 shrink-0 text-gold" />
                {SITE.hours}
              </p>
            </address>
          </div>
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div className="max-w-md">
            <p className="font-display text-xl text-white">
              A little note from our garden.
            </p>
            <div className="mt-3">
              <NewsletterForm />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="mr-1 text-[11px] uppercase tracking-wider text-white/35">
              We accept
            </span>
            <span className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60">
              Cash
            </span>
            <span className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60">
              eSewa
            </span>
            <span className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60">
              Khalti
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Purple Haze Restro &amp; Garden. All
            rights reserved.
          </p>
          <Link
            href="/login?next=/admin"
            className="inline-flex items-center gap-1 transition hover:text-white"
          >
            Staff login <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
