import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Phone, Sparkles, Utensils } from "lucide-react";
import { EventMenuBrowser } from "@/components/events/event-menu-browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { getEventMenus } from "@/lib/event-menus-store";
import { SITE } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Event Menus & Banquet Packages | Purple Haze Restro & Garden",
  description:
    "Explore luxury wedding menus, live garden BBQ buffets, birthday feast packages and corporate catering on Airport Road, Biratnagar. Fully customized multi-course menus.",
  alternates: { canonical: "/events/menu" },
};

export default async function EventMenusPage() {
  const packages = await getEventMenus();

  return (
    <>
      {/* HERO BANNER */}
      <section className="relative overflow-hidden bg-ink py-16 text-white lg:py-24">
        <SmartImage
          src="/images/venues/banquet-hall-setup.jpg"
          alt="Banquet and event catering setup"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />

        <div className="container-page relative">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> Back to Venues &amp; Spaces
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="gold" className="rounded-full px-3 py-1">
              <Sparkles className="size-3" /> Handcrafted Event Menus
            </Badge>
            <span className="text-xs text-white/60">Biratnagar, Nepal</span>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
            Flavours made for
            <br />
            <span className="text-gold italic">unforgettable gatherings.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">
            From royal wedding banquets to open-air garden BBQ evenings and corporate
            buffets. Every package is curated by our master chefs with live cooking counters,
            fresh Himalayan herbs and dedicated hospitality.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold">
              <a href="#budget-estimator">
                Estimate Party Budget
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <a href={`tel:${SITE.phoneRaw}`}>
                <Phone className="size-4" /> Call Catering Manager
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/50">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-gold" /> Airport Road, Biratnagar
            </span>
            <span className="inline-flex items-center gap-2">
              <Utensils className="size-4 text-gold" /> 20 to 500+ Guest Capacity
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 text-gold" /> Live Grills &amp; Custom Buffets
            </span>
          </div>
        </div>
      </section>

      {/* PACKAGES BROWSER & INTERACTIVE ESTIMATOR */}
      <section className="container-page py-16 lg:py-24">
        <EventMenuBrowser packages={packages} />
      </section>

      {/* WHY HOST AT PURPLE HAZE */}
      <section className="border-t border-border/60 bg-muted/30 py-16 lg:py-20">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <p className="eyebrow">The Purple Haze Standard</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Why hosts in Biratnagar choose us.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every detail is designed so you can enjoy your occasion without stress.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Four Authentic Kitchens",
                description: "Nepali local curries, North Indian gravies, Tandoori grills and Asian wok items all prepared fresh on site.",
              },
              {
                title: "Lush Garden & Hall",
                description: "Choose between romantic open-air garden lawn seating or air-conditioned banquet hall arrangements.",
              },
              {
                title: "Live Cooking Stations",
                description: "Sekuwa charcoal grills, piping-hot momo bars and live tandoors serving hot breads right to the table.",
              },
              {
                title: "Complete Event Support",
                description: "Dedicated banquet manager, audio sound systems, buffet attendants and customizable decor options.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-primary/25 bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">
                Need a custom menu with specific dishes?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Our chef will design a personalized menu tailored to your family traditions or dietary preferences.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/events#enquire">
                Send Custom Event Enquiry
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
