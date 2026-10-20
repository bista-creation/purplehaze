import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Clock,
  Leaf,
  MapPin,
  PartyPopper,
  Quote,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { DishCard } from "@/components/menu/dish-card";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import {
  getActiveBanners,
  getFeaturedDishes,
  getMenuCategories,
  getPublicGallery,
  getPublicVenues,
  getTestimonials,
} from "@/lib/queries";
import { getPublicSettings } from "@/lib/settings";
import { SITE } from "@/lib/constants";
import { truncate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Purple Haze Restro & Garden | Biratnagar",
  description:
    "A garden restaurant, banquet venue and meeting space on Airport Road, Biratnagar. Order Nepali, Indian, Asian and continental food online or reserve a table.",
  alternates: { canonical: "/" },
};

const highlights = [
  {
    icon: Leaf,
    title: "Garden dining",
    copy: "Open-air evenings under warm lights and leafy corners.",
  },
  {
    icon: ChefHat,
    title: "Four kitchens, one table",
    copy: "Nepali comfort food, Indian classics, Asian and continental.",
  },
  {
    icon: PartyPopper,
    title: "Made for occasions",
    copy: "A banquet hall, meeting rooms and garden celebrations.",
  },
  {
    icon: MapPin,
    title: "Easy to find",
    copy: "Airport Road, Biratnagar — with parking on site.",
  },
];

export default async function HomePage() {
  const [
    categories,
    featured,
    venues,
    testimonials,
    gallery,
    banners,
    settings,
  ] = await Promise.all([
    getMenuCategories(),
    getFeaturedDishes(8),
    getPublicVenues(),
    getTestimonials(3),
    getPublicGallery(),
    getActiveBanners(),
    getPublicSettings(),
  ]);

  const displayCategories = categories.slice(0, 4);
  const banner = banners[0];

  return (
    <>
      <section className="hero-mesh relative overflow-hidden">
        <video
          className="absolute inset-0 size-full object-cover"
          src="/images/hero/gemini_generated_video_4cb2aad1.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-purple-950/60" />
        {/* overlay */}
        <div
          className="pointer-events-none absolute -right-20 top-1/3
    size-96 overflow-hidden rounded-full
    border border-gold/20 hero-float"
          aria-hidden="true"
        >
          <SmartImage
            src="/images/menu/nepolitana-pizza.jpg"
            alt=""
            fill
            sizes="384px"
            className="object-cover opacity-90"
          />
        </div>

        <div className="container-page relative grid items-center gap-12 pb-20 pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <Reveal>
              <Badge
                variant="gold"
                className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
              >
                <Sparkles className="size-3" />
                {settings.heroEyebrow}
              </Badge>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="display-title mt-5 max-w-xl !text-3xl sm:!text-4xl lg:!text-5xl [text-shadow:2px_3px_8px_rgba(0,0,0,0.35)]">
                Dinner under the{" "}
                <span className="text-gradient italic">stars.</span>
                <br />
                Memories around the table.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                {settings.heroSubtitle}
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/menu">
                    Explore the menu <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/reservations">
                    <CalendarDays className="size-4" /> Reserve a table
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> Open daily, 9 AM –
                  10 PM
                </span>
                <span className="inline-flex items-center gap-2">
                  <UtensilsCrossed className="size-4 text-primary" /> Delivery,
                  pickup &amp; dine-in
                </span>
                <span className="inline-flex items-center gap-2">
                  <Wine className="size-4 text-primary" /> Garden &amp; banquet
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18} className="relative">
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -left-4 -top-5 hidden rounded-2xl border border-gold/30 bg-card/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  On Airport Road
                </p>
                <p className="mt-0.5 text-sm font-medium">Biratnagar 56613</p>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-[6px] border-white/70 shadow-[0_35px_90px_-40px_rgba(26,16,37,0.6)] dark:border-white/10">
                <SmartImage
                  src="/images/venues/garden-sitting-area.jpg"
                  alt="Warm, leafy dining at Purple Haze Restro & Garden"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                    The Purple Haze feeling
                  </p>
                  <p className="mt-2 font-display text-xl leading-snug sm:text-2xl">
                    Golden light, generous plates and room for everyone.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-3 max-w-[220px] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur sm:-right-7 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-primary">
                    <PartyPopper className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Celebrating?</p>
                    <p className="text-[11px] text-muted-foreground">
                      Spaces for 3 venues
                    </p>
                  </div>
                </div>
                <Link
                  href="/events"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Explore venues <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="border-t border-border/60 bg-card/55 backdrop-blur">
          <div className="container-page grid gap-5 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {banner ? (
        <section className="container-page pt-12">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-8">
            {banner.image ? (
              <SmartImage
                src={banner.image}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-40"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                  At the restaurant
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">
                  {banner.title}
                </h2>
                {banner.subtitle ? (
                  <p className="mt-1 text-sm text-white/60">
                    {banner.subtitle}
                  </p>
                ) : null}
              </div>
              {banner.ctaLabel && banner.ctaHref ? (
                <Button asChild variant="gold">
                  <Link href={banner.ctaHref}>
                    {banner.ctaLabel} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-20 lg:py-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <p className="eyebrow">Find your craving</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              Four cuisines. One table.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Button asChild variant="outline">
              <Link href="/menu">
                See the full menu <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {displayCategories.map((category, index) => (
            <Reveal key={category.id} delay={index * 0.07}>
              <Link
                href={`/menu?category=${category.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-ink"
              >
                <SmartImage
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    {category.dishes.length} dishes
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-white">
                    {category.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">
                    {category.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/80 transition group-hover:text-gold">
                    Browse {category.name.toLowerCase()}{" "}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/50 py-20 lg:py-24">
        <div className="container-page">
          <Reveal className="text-center">
            <p className="eyebrow">From our kitchen</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              The dishes people come back for.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Start with something familiar or try a new favourite. Every plate
              is made to order.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((dish, index) => (
              <Reveal key={dish.id} delay={(index % 4) * 0.06}>
                <DishCard dish={dish} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/menu">
                Order something delicious <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <SmartImage
                  src="/images/gallery/dining.jpg"
                  alt="A table set for dinner at Purple Haze"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-2xl">
                <SmartImage
                  src="/images/venues/dinning-hall.jpg"
                  alt="Evening lights in the Purple Haze garden"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-xl border border-gold/30 bg-card px-5 py-3 text-center shadow-xl">
              <p className="font-display text-lg font-semibold">
                Since the beginning
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Made in Biratnagar
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="eyebrow">Our story</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              {settings.aboutTitle}
            </h2>
            <p className="mt-5 whitespace-pre-line text-base leading-8 text-muted-foreground">
              {settings.aboutBody}
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {[
                "A leafy outdoor garden",
                "Banquet & meeting spaces",
                "Local and international menus",
                "Parking on site",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="grid size-5 place-items-center rounded-full bg-gold/25 text-amber-700 dark:text-gold">
                    <Star className="size-3 fill-current" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/about">
                Read our story <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-20 text-white lg:py-28">
        <div
          className="pointer-events-none absolute -right-24 top-0 size-96 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="container-page relative">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <Reveal>
              <p className="eyebrow !text-gold">Events &amp; venues</p>
              <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
                Some evenings deserve a bigger room.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/55">
                From intimate dinners to wedding receptions, conferences and
                birthday celebrations. Tell us what you have in mind.
              </p>
              <Button asChild variant="gold" className="mt-7">
                <Link href="/events">
                  Plan an event <ArrowRight className="size-4" />
                </Link>
              </Button>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {venues.slice(0, 3).map((venue, index) => (
                <Reveal
                  key={venue.id}
                  delay={index * 0.08}
                  className={index === 0 ? "sm:col-span-2" : undefined}
                >
                  <Link
                    href={`/events#${venue.slug}`}
                    className={`group relative block overflow-hidden rounded-2xl ${
                      index === 0 ? "aspect-[16/8]" : "aspect-[4/3]"
                    }`}
                  >
                    <SmartImage
                      src={venue.image}
                      alt={venue.name}
                      fill
                      sizes={index === 0 ? "60vw" : "30vw"}
                      className="object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                      <div>
                        <p className="font-display text-xl">{venue.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                          {truncate(venue.description, 78)}
                        </p>
                      </div>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/20 text-white/70 transition group-hover:border-gold group-hover:text-gold">
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 ? (
        <section className="container-page py-20 lg:py-28">
          <Reveal className="text-center">
            <p className="eyebrow">Around the table</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              What guests take home.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Reveal key={testimonial.id} delay={index * 0.08}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <Quote className="size-7 text-gold" aria-hidden />
                  <blockquote className="mt-4 flex-1 text-sm leading-7 text-foreground/80">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-5 border-t pt-4">
                    <div
                      className="flex gap-0.5 text-gold"
                      aria-label={`${testimonial.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={`size-3.5 ${
                            starIndex < testimonial.rating
                              ? "fill-current"
                              : "opacity-25"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {testimonial.name}
                    </p>
                    {testimonial.location ? (
                      <p className="text-xs text-muted-foreground">
                        {testimonial.location}
                      </p>
                    ) : null}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Guest notes shared with our team. Menu and venue details can change.
          </p>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section className="border-y border-border/60 bg-card/40 py-20 lg:py-24">
          <div className="container-page">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <Reveal>
                <p className="eyebrow">A look around</p>
                <h2 className="mt-2 font-display text-4xl font-semibold">
                  Golden hours at Purple Haze.
                </h2>
              </Reveal>
              <Button asChild variant="outline">
                <Link href="/gallery">
                  Open the gallery <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid h-[420px] grid-cols-2 gap-3 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2">
              {gallery.slice(0, 5).map((image, index) => (
                <Link
                  key={image.id}
                  href="/gallery"
                  className={`group relative overflow-hidden bg-muted ${
                    index === 0 ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  <SmartImage
                    src={image.url}
                    alt={image.title}
                    fill
                    sizes={index === 0 ? "50vw" : "25vw"}
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/20" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-20 lg:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-secondary/50 px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
            <div
              className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-primary/10"
              aria-hidden
            />
            <div>
              <p className="eyebrow">Your table is waiting</p>
              <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
                Come for dinner.
                <br />
                Stay for the evening.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                Request a table for a date night, family lunch or a group
                catch-up. Our team will confirm availability and any details.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/reservations">
                    <CalendarDays className="size-4" /> Request a table
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={`tel:${SITE.phoneRaw}`}>Call {SITE.phone}</a>
                </Button>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 lg:mt-0">
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <Clock className="size-5 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">
                  Every day
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  9:00 AM – 10:00 PM
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <MapPin className="size-5 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">
                  Airport Road
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Biratnagar 56613
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <UtensilsCrossed className="size-5 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">
                  Order online
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Delivery, pickup, dine-in
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <PartyPopper className="size-5 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">
                  Events
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Capacity on request
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
