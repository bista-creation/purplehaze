import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  HeartHandshake,
  Leaf,
  MapPin,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { getPublicSettings } from "@/lib/settings";
import { SITE } from "@/lib/constants";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Purple Haze Restro & Garden is a garden restaurant, banquet venue and meeting place on Airport Road, Biratnagar. Come for the food; stay for the evening.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: UtensilsCrossed,
    title: "Cooked with care",
    copy: "Familiar Nepali and Indian dishes alongside Asian and continental favourites, made to order rather than kept waiting.",
  },
  {
    icon: Leaf,
    title: "Room to breathe",
    copy: "A leafy garden, an indoor dining room and event spaces give every table its own mood.",
  },
  {
    icon: HeartHandshake,
    title: "Made for people",
    copy: "Long family lunches, first dates, team dinners and once-in-a-lifetime receptions all belong here.",
  },
  {
    icon: Sparkles,
    title: "Occasions, handled",
    copy: "Our team helps with menus, timing and layouts so hosts can actually enjoy their own celebration.",
  },
];

export default async function AboutPage() {
  const settings = await getPublicSettings();

  return (
    <>
      <section className="hero-mesh border-b border-border/60">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <Badge variant="gold" className="rounded-full px-3 py-1">
              <Sparkles className="size-3" /> Our story
            </Badge>
            <h1 className="display-title mt-5 max-w-2xl">
              A little purple,
              <br />
              <span className="text-gradient italic">a lot of heart.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              {settings.aboutBody}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/reservations">
                  <CalendarDays className="size-4" /> Reserve a table
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/menu">
                  Browse the menu <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <Reveal className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[5px] border-white/70 shadow-[var(--shadow-lift)] dark:border-white/10">
              <SmartImage
                src="/images/gallery/interior.jpg"
                alt="The dining room at Purple Haze Restro & Garden"
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 44vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-5 rounded-2xl border border-border bg-card px-5 py-4 shadow-lg sm:left-8">
              <p className="font-display text-xl font-semibold">
                Airport Road
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary" /> Biratnagar 56613
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow">The idea</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              A garden table for every kind of day.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="space-y-5 text-[15px] leading-8 text-muted-foreground">
            <p>
              Purple Haze is built around a simple thought: the best meals are
              the ones that make room for people. Some evenings call for momos
              and a quick catch-up. Others call for a slow curry, a long table
              and a reason to dress up.
            </p>
            <p>
              Our kitchen moves between four familiar cuisines — Nepali, Indian,
              Asian and continental — so a family with different cravings can
              order one table they all enjoy. Our garden and indoor spaces do the
              same job for the room: relaxed dinners, private lunches and
              celebrations under warm lights.
            </p>
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm leading-7 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-1.5">
                  <SmartImage
                    src="/images/brand/364623351_671945731625569_1260004624802552929_n.png"
                    alt="Purple Haze Restro & Garden logo"
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    A note on this page
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    The owner&apos;s full story, founding date and archived
                    photographs are still being collected. This page avoids
                    inventing details in the meantime.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/50 py-16 lg:py-24">
        <div className="container-page">
          <Reveal className="text-center">
            <p className="eyebrow">What we care about</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              The details that make an evening.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-border bg-card p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <value.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {value.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 grid grid-cols-2 gap-3 lg:order-1">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <SmartImage
                src="/images/venues/garden.jpg"
                alt="The garden at Purple Haze"
                fill
                sizes="(max-width: 1024px) 45vw, 24vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-2xl">
              <SmartImage
                src="/images/menu/food-presentation.jpg"
                alt="A dish prepared in the Purple Haze kitchen"
                fill
                sizes="(max-width: 1024px) 45vw, 24vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.08} className="order-1 lg:order-2">
            <p className="eyebrow">More than lunch</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              From a quick plate to a full celebration.
            </h2>
            <div className="mt-6 space-y-5">
              <div className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-amber-700 dark:text-gold">
                  <ChefHat className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    The everyday table
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Order for delivery or pickup, or settle into the garden for
                    a meal with friends. Our full menu is available online.
                  </p>
                  <Link
                    href="/menu"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Explore the menu <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    The bigger occasion
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Weddings, receptions, birthdays, conferences and meetings.
                    Tell us the date and guest count; we will help with the rest.
                  </p>
                  <Link
                    href="/events"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Plan an event <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-16 lg:pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/30 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
                Come say hello
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                There is always a seat for you.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                Find us on Airport Road in Biratnagar. Open daily from 9:00 AM
                to 10:00 PM, with lunch, dinner and everything in between.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gold">
                <Link href="/reservations">Reserve a table</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                <a href={SITE.mapUrl} target="_blank" rel="noopener noreferrer">
                  Get directions
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
