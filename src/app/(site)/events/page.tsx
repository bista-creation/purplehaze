import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Compass,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Sparkles,
  TreePine,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { EventBookingForm } from "@/components/forms/event-booking-form";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { getPublicVenues } from "@/lib/queries";
import { getEventMenus } from "@/lib/event-menus-store";
import { formatNPR } from "@/lib/money";
import { EVENT_TYPES, FALLBACK_VENUE_IMAGE, SITE } from "@/lib/constants";
import { parseJsonArray } from "@/lib/utils";
import { todayInNepal } from "@/lib/time";
import { CANONICAL_VENUES, type VenueSpace } from "@/lib/venues-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events & Venues | Purple Haze Restro & Garden",
  description:
    "Host weddings, receptions, corporate meetings, seminars, and outdoor gatherings at Purple Haze Restro & Garden, Airport Road, Biratnagar. Explore our Banquet Hall (up to 300 guests), two Meeting Halls (up to 100 & 50 guests), and Open Garden.",
  alternates: { canonical: "/events" },
};

const eventTypeIcons = [PartyPopper, Building2, UsersRound, Sparkles, CalendarDays, Check];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; package?: string; guests?: string }>;
}) {
  const [dbVenues, eventMenus, { venue, package: pkg, guests }] = await Promise.all([
    getPublicVenues(),
    getEventMenus(),
    searchParams,
  ]);
  const minDate = todayInNepal();

  // Merge database venues with canonical data for rich photography and event types
  const spaces = CANONICAL_VENUES.map((canonical) => {
    const matchedDb = dbVenues.find((v) => v.slug === canonical.slug);
    return {
      ...canonical,
      id: matchedDb?.id || canonical.id,
      name: matchedDb?.name || canonical.name,
      description: matchedDb?.description || canonical.description,
      longDescription: matchedDb?.longDescription || canonical.longDescription,
      image: matchedDb?.image || canonical.image,
      capacity: matchedDb?.capacity !== undefined ? matchedDb.capacity : canonical.capacity,
      features: matchedDb?.features ? parseJsonArray(matchedDb.features) : canonical.features,
    };
  });

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-ink py-16 text-white lg:py-24">
        <SmartImage
          src="/images/venues/banquet.jpg"
          alt="Purple Haze Restro & Garden Banquet Hall"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        <div className="container-page relative">
          <Badge variant="gold" className="rounded-full px-3 py-1">
            <PartyPopper className="size-3" /> Event Spaces &amp; Venues
          </Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.12] sm:text-5xl lg:text-6xl">
            Unforgettable moments,
            <br />
            <span className="text-gold italic">in spaces made to gather.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">
            From grand wedding celebrations and expansive outdoor garden evenings to focused executive conferences and interactive workshops. Explore our single Grand Banquet Hall, two dedicated Meeting Halls, and lush Open Garden on Airport Road, Biratnagar.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="#spaces">
                <Compass className="size-4" /> Compare Spaces
              </Link>
            </Button>
            <Button asChild variant="default" size="lg">
              <Link href="#enquire">
                Enquire / Book an Event <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/10 text-white backdrop-blur-xs hover:bg-white/20 hover:text-white"
            >
              <Link href="/events/menu">
                <UtensilsCrossed className="size-4" /> Event Menus
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <a href={`tel:${SITE.phoneRaw}`}>
                <Phone className="size-4" /> Call Events Team
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/60">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-gold" /> Airport Road, Biratnagar
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 text-gold" /> Open daily, 9:00 AM – 10:00 PM
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4 text-gold" /> {SITE.email}
            </span>
          </div>
        </div>
      </section>

      {/* QUICK COMPARISON SECTION */}
      <section id="spaces" className="scroll-mt-20 border-b border-border/60 bg-card/45 py-14 lg:py-20">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">At a glance</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Compare our event spaces.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Choose the setting that suits your guest count and celebration style. Capacities are confirmed with our team according to your seating layout.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {spaces.map((space, index) => (
              <Reveal key={space.id} delay={index * 0.05}>
                <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:border-primary/50 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                      <Badge variant={space.capacity ? "gold" : "outline"} className="text-xs font-semibold">
                        <UsersRound className="mr-1 size-3" />
                        {space.capacity ? `Up to ${space.capacity} guests` : "Flexible layout"}
                      </Badge>
                    </div>

                    <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                      {space.name}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {space.description}
                    </p>

                    <div className="mt-4 border-t border-border/60 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Suitable For
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {space.suitableFor.map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-foreground/90">
                            <Check className="size-3 text-primary shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-2">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/events?venue=${space.id}#enquire`}>
                        Enquire Space <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILED SPACES SHOWCASE */}
      <section className="py-16 lg:py-24">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Detailed spaces</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              Explore each venue up close.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Every space at Purple Haze is thoughtfully maintained with authentic indoor comfort and lush garden surroundings. Real photographs from our Airport Road property.
            </p>
          </Reveal>

          <div className="mt-12 space-y-12">
            {spaces.map((space, index) => (
              <Reveal key={space.id} delay={index * 0.08}>
                <article
                  id={space.slug}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:shadow-md"
                >
                  <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Primary Photo & Gallery Strip */}
                    <div className="flex flex-col bg-muted/40">
                      <div className="relative min-h-[300px] sm:min-h-[380px] w-full overflow-hidden">
                        <SmartImage
                          src={space.image || FALLBACK_VENUE_IMAGE}
                          alt={`${space.name} - Purple Haze Restro & Garden`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          className="object-cover"
                        />
                        <div className="absolute left-4 top-4">
                          <Badge variant="gold" className="px-3 py-1 text-xs shadow-md">
                            <UsersRound className="mr-1.5 size-3.5" />
                            {space.capacity ? `Capacity: Up to ${space.capacity} guests` : "Capacity on enquiry"}
                          </Badge>
                        </div>
                      </div>

                      {/* Photo Gallery Thumbnails */}
                      {space.gallery && space.gallery.length > 1 ? (
                        <div className="grid grid-cols-4 gap-2 border-t border-border/60 bg-card p-2 sm:p-3">
                          {space.gallery.map((thumbUrl, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted/20"
                            >
                              <SmartImage
                                src={thumbUrl}
                                alt={`${space.name} view ${idx + 1}`}
                                fill
                                sizes="120px"
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Details Column */}
                    <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-display text-2xl font-bold sm:text-3xl">
                            {space.name}
                          </h3>
                          <Badge variant={space.capacity ? "violet" : "outline"} className="text-xs">
                            {space.capacity ? `Up to ${space.capacity} guests` : "Flexible outdoor space"}
                          </Badge>
                        </div>

                        <p className="mt-4 text-sm font-medium leading-6 text-foreground">
                          {space.description}
                        </p>

                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          {space.longDescription}
                        </p>

                        {/* Suitable Events */}
                        <div className="mt-6">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Ideal For
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {space.suitableFor.map((item) => (
                              <Badge key={item} variant="secondary" className="px-2.5 py-1 text-xs font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Space Highlights */}
                        <div className="mt-6 border-t border-border/60 pt-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Key Details
                          </p>
                          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {space.features.map((feat) => (
                              <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Check className="size-3.5 text-primary shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
                        <Button asChild size="default" className="w-full sm:w-auto">
                          <Link
                            href={`/events?venue=${space.id}#enquire`}
                            aria-label={`Enquire about ${space.name}`}
                          >
                            Enquire / Book This Space <ArrowRight className="size-4 ml-1.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
                          <a href={`tel:${SITE.phoneRaw}`}>
                            <Phone className="size-4 mr-1.5" /> Direct Call
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* OCCASIONS WE HOST */}
      <section className="border-t border-border/60 bg-card/45 py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <Reveal>
              <p className="eyebrow">What we host</p>
              <h2 className="mt-2 font-display text-4xl font-semibold">
                Every occasion has its perfect setting.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Whether celebrating a wedding, organizing an institutional seminar, or hosting an intimate family dinner, our events team helps bring every detail together seamlessly.
              </p>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {EVENT_TYPES.filter((type) => type !== "Other").map((type, index) => {
                const Icon = eventTypeIcons[index % eventTypeIcons.length];
                return (
                  <Reveal key={type} delay={(index % 4) * 0.05}>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
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
        </div>
      </section>

      {/* EVENT MENUS SHOWCASE */}
      <section className="border-y border-border/60 bg-gradient-to-b from-card/45 via-card to-background py-16 lg:py-24">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Reveal className="max-w-xl">
              <Badge variant="gold" className="rounded-full px-3 py-1 text-[10px]">
                <Sparkles className="size-3" /> Celebration Catering
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                Curated celebration menus.
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Pair your chosen venue with delicious Nepali, Indian, and Continental catering packages prepared fresh by our culinary brigade.
              </p>
            </Reveal>
            <Button asChild size="lg" className="w-fit">
              <Link href="/events/menu">
                View All Event Menus &amp; Estimate <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventMenus.slice(0, 3).map((pkgItem, idx) => (
              <Reveal key={pkgItem.id} delay={idx * 0.08}>
                <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:border-primary/40 hover:shadow-md">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <SmartImage
                      src={pkgItem.image || FALLBACK_VENUE_IMAGE}
                      alt={pkgItem.name}
                      fill
                      sizes="350px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 flex gap-1">
                      <Badge variant="violet" className="text-[10px]">{pkgItem.eventType}</Badge>
                      {pkgItem.isPopular ? <Badge variant="gold" className="text-[10px]">Popular</Badge> : null}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between text-white">
                      <span className="font-display text-xl font-bold text-gold">
                        {formatNPR(pkgItem.pricePerPerson * 100)} <span className="text-xs font-normal text-white/70">/ person</span>
                      </span>
                      <span className="text-[11px] text-white/80">Min. {pkgItem.minGuests} guests</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold group-hover:text-primary">{pkgItem.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{pkgItem.tagline || pkgItem.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {pkgItem.badges.slice(0, 3).map((b) => (
                        <span key={b} className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">{b}</span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3">
                      <Link href={`/events/menu#${pkgItem.slug}`} className="text-xs font-semibold text-primary hover:underline">
                        Explore courses &rarr;
                      </Link>
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                        <Link href={`/events?package=${encodeURIComponent(pkgItem.slug)}#enquire`}>
                          Select this menu
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ENQUIRY / BOOK AN EVENT FORM */}
      <section id="enquire" className="container-page scroll-mt-28 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">Enquire / Book an Event</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              Start with a date, space, and guest count.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Send us your requirements. Our dedicated Biratnagar event manager will get back to you with layout options, menu suggestions, and personalized guidance. No pressure, no instant charges.
            </p>
            <div className="mt-7 space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Call our events desk</p>
                  <a
                    href={`tel:${SITE.phoneRaw}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {SITE.phone}
                  </a>
                  <p className="text-xs text-muted-foreground">{SITE.topbarPhone || SITE.landline}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Email the events team</p>
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
                  <p className="text-sm font-semibold">Location &amp; Site Visits</p>
                  <p className="text-sm text-muted-foreground">
                    {SITE.address.line1}, {SITE.address.line2}, {SITE.address.city}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <EventBookingForm
                venues={spaces.map((s) => ({
                  id: s.id,
                  name: s.capacity ? `${s.name} (Up to ${s.capacity} guests)` : `${s.name} (Outdoor space)`,
                }))}
                minDate={minDate}
                initialVenueId={
                  spaces.some((item) => item.id === venue) ? venue : ""
                }
                initialPackage={pkg ?? ""}
                initialGuests={guests ? Number(guests) : undefined}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRACTICAL BOOKING NOTES */}
      <section className="container-page pb-16 lg:pb-24">
        <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-6 sm:p-8 lg:grid-cols-2 lg:gap-8">
          <div>
            <p className="eyebrow">Practical details</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Good to know when planning.
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              <strong className="text-foreground">Capacities:</strong> Banquet Hall accommodates up to 300 guests; Meeting Halls accommodate up to 100 and up to 50 guests respectively; Open Garden capacity is tailored flexibly to your event layout.
            </p>
            <p>
              <strong className="text-foreground">Site Visits:</strong> Walkthroughs are warmly welcomed so you can inspect the halls and open garden in person with our event coordinator.
            </p>
            <p>
              <strong className="text-foreground">Transparent Quotes:</strong> Custom quotes and menu options are provided directly based on your guest count and chosen setup.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
