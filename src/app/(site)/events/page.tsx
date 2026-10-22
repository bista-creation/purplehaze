import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { EventBookingForm } from "@/components/forms/event-booking-form";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { getPublicVenues } from "@/lib/queries";
import { EVENT_TYPES, FALLBACK_VENUE_IMAGE, SITE } from "@/lib/constants";
import { parseJsonArray } from "@/lib/utils";
import { todayInNepal } from "@/lib/time";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events & venues",
  description:
    "Host a wedding reception, birthday, corporate meeting or private celebration at Purple Haze Restro & Garden, Airport Road, Biratnagar. Tell us what you have in mind.",
  alternates: { canonical: "/events" },
};

const eventTypeIcons = [PartyPopper, Building2, UsersRound, Sparkles, CalendarDays, Check];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const [venues, { venue }] = await Promise.all([
    getPublicVenues(),
    searchParams,
  ]);
  const minDate = todayInNepal();

  return (
    <>
      <section className="relative overflow-hidden bg-ink py-16 text-white lg:py-24">
        <SmartImage
          src="/images/venues/banquet-hall-setup.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="container-page relative">
          <Badge variant="gold" className="rounded-full px-3 py-1">
            <PartyPopper className="size-3" /> Events & venues
          </Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
            Some evenings deserve
            <br />
            <span className="text-gold italic">a bigger room.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/60">
            Garden dinners, wedding receptions, birthday tables, conferences and
            quiet meetings. Tell us the date, the guest count and the feeling you
            want — our team will help shape the rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold">
              <Link href="#enquire">
                Send an enquiry <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <a href={`tel:${SITE.phoneRaw}`}>
                <Phone className="size-4" /> Call the events team
              </a>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/50">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-gold" /> Airport Road, Biratnagar
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 text-gold" /> Open daily, 9 AM – 10 PM
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4 text-gold" /> {SITE.email}
            </span>
          </div>
        </div>
      </section>

      <section className="container-page py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">What we host</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              Every table has a reason.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              These are the occasions guests most often bring to us. If yours is
              not listed, ask anyway — the answer is usually a conversation.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {EVENT_TYPES.filter((type) => type !== "Other").map((type, index) => {
              const Icon = eventTypeIcons[index % eventTypeIcons.length];
              return (
                <Reveal key={type} delay={(index % 4) * 0.05}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium">{type}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/45 py-16 lg:py-24">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Our spaces</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              Choose the room that fits the moment.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Exact capacities, layouts and event packages are confirmed with our
              team. The details below are starting points, not fixed limits.
            </p>
          </Reveal>

          <div className="mt-10 space-y-6">
            {venues.map((venue, index) => (
              <Reveal key={venue.id} delay={index * 0.06}>
                <article
                  id={venue.slug}
                  className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[0.9fr_1.1fr]"
                >
                  <div className="relative min-h-64 lg:min-h-80">
                    <SmartImage
                      src={venue.image || FALLBACK_VENUE_IMAGE}
                      alt={venue.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl font-semibold sm:text-3xl">
                        {venue.name}
                      </h3>
                      <Badge variant="outline">
                        {venue.capacity
                          ? `Up to ${venue.capacity} guests`
                          : "Capacity on request"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {venue.description}
                    </p>
                    {venue.longDescription ? (
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {venue.longDescription}
                      </p>
                    ) : null}
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {parseJsonArray(venue.features).map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <Check className="size-3.5 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button asChild size="sm" className="w-full sm:w-auto">
                        <Link
                          href={`/events?venue=${venue.id}#enquire`}
                          aria-label={`Enquire about ${venue.name}`}
                        >
                          Enquire about this venue
                        </Link>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {venue.priceFrom
                          ? `Packages from ${(venue.priceFrom / 100).toLocaleString(
                              "en-IN",
                            )} NPR`
                          : "Package pricing on request"}
                      </span>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="enquire" className="container-page scroll-mt-28 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">Tell us what you have in mind</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              Start with a date and a rough guest count.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              We will come back with availability, a suggested space and the
              next questions. No pressure, no instant charge — an enquiry is
              just a conversation.
            </p>
            <div className="mt-7 space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Call us</p>
                  <a
                    href={`tel:${SITE.phoneRaw}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {SITE.phone}
                  </a>
                  <p className="text-xs text-muted-foreground">{SITE.landline}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Email the team</p>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="break-all text-sm text-muted-foreground hover:text-primary"
                  >
                    {SITE.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Visit</p>
                  <p className="text-sm text-muted-foreground">
                    {SITE.address.line1}, {SITE.address.line2}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <EventBookingForm
                venues={venues.map((venue) => ({
                  id: venue.id,
                  name: venue.name,
                }))}
                minDate={minDate}
                initialVenueId={
                  venues.some((item) => item.id === venue) ? venue : ""
                }
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-16 lg:pb-24">
        <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-6 sm:p-8 lg:grid-cols-2 lg:gap-8">
          <div>
            <p className="eyebrow">A few practical notes</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Good to know before you book.
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              <strong className="text-foreground">Capacity:</strong> final
              capacity depends on the layout, stage and dining style. We confirm
              it in writing with your quote.
            </p>
            <p>
              <strong className="text-foreground">Menu &amp; packages:</strong>{" "}
              we build these around your guest count and service style. Ask for a
              current sample menu; prices are not invented on this page.
            </p>
            <p>
              <strong className="text-foreground">Site visits:</strong> welcome by
              appointment so a team member can walk you through the spaces.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
