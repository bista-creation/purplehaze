import type { Metadata } from "next";
import {
  Accessibility,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { GrievanceDesk } from "@/components/legal/grievance-desk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, email or visit Purple Haze Restro & Garden on Airport Road, Biratnagar. Questions about orders, reservations, events, accessibility and grievances are welcome.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="hero-mesh border-b border-border/60 py-14 lg:py-20">
        <div className="container-page">
          <Badge variant="gold" className="rounded-full px-3 py-1">
            <Send className="size-3" /> Get in touch
          </Badge>
          <h1 className="display-title mt-5 max-w-3xl">
            We would love
            <br />
            <span className="text-gradient italic">to hear from you.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
            A question about the menu, a reservation, a big celebration or
            accessibility at the restaurant — send a note and the right person
            will get back to you.
          </p>
        </div>
      </section>

      <section className="container-page py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-2xl font-semibold">
                Find us on Airport Road
              </h2>
              <address className="mt-4 space-y-4 not-italic">
                <a
                  href={SITE.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm leading-6 text-muted-foreground transition hover:text-primary"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {SITE.address.line1}
                    <br />
                    {SITE.address.line2}, {SITE.address.state}
                    <br />
                    {SITE.address.country}
                  </span>
                </a>
                <div className="space-y-2 border-y border-border/50 py-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Direct Contact Channels
                  </p>
                  <a
                    href={`tel:${SITE.landlineRaw}`}
                    className="flex items-center gap-3 transition hover:text-primary"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span>Landline: {SITE.landline}</span>
                  </a>
                  <a
                    href={`tel:${SITE.landlineSecondaryRaw}`}
                    className="flex items-center gap-3 transition hover:text-primary"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span>Landline 2: {SITE.landlineSecondary}</span>
                  </a>
                  <a
                    href={`tel:${SITE.managerPhoneRaw}`}
                    className="flex items-center gap-3 transition hover:text-primary"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span>Manager &amp; WhatsApp: {SITE.managerPhone}</span>
                  </a>
                  <a
                    href={`tel:${SITE.ownerPhoneRaw}`}
                    className="flex items-center gap-3 transition hover:text-primary"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span>Owner (Raju Khadka): {SITE.ownerPhone}</span>
                  </a>
                </div>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-start gap-3 break-all text-sm transition hover:text-primary"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                  {SITE.email}
                </a>
                <p className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  {SITE.hours}
                </p>
              </address>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button asChild size="sm">
                  <a href={`tel:${SITE.phoneRaw}`}>
                    <Phone className="size-4" /> Call now
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://wa.me/${SITE.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <div
              id="accessibility"
              className="scroll-mt-28 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-6"
            >
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Accessibility className="size-5 text-primary" /> Accessibility
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                If you use a wheelchair, have a service animal, need a quieter
                table or have a dietary requirement, tell us in the form. We
                will confirm what is possible before your visit rather than
                guess.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
              <iframe
                src={SITE.mapEmbedUrl}
                title="Map showing Purple Haze Restro & Garden on Airport Road, Biratnagar"
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                href={SITE.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-border px-5 py-3 text-center text-xs font-semibold text-primary hover:bg-secondary/50"
              >
                Open in Google Maps
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-8">
            <div className="mb-6">
              <p className="eyebrow">Send a message</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                How can we help?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We reply during opening hours. For same-day order problems,
                calling is fastest.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>

        <div className="mt-12">
          <GrievanceDesk />
        </div>
      </section>
    </>
  );
}
