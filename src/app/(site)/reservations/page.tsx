import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  PartyPopper,
  Phone,
  UsersRound,
} from "lucide-react";
import { ReservationForm } from "@/components/forms/reservation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { SITE } from "@/lib/constants";
import { todayInNepal } from "@/lib/time";

export const metadata: Metadata = {
  title: "Reservations",
  description:
    "Request a table at Purple Haze Restro & Garden, Airport Road, Biratnagar. For larger groups and private events, our team can help with a venue.",
  alternates: { canonical: "/reservations" },
};

export default function ReservationsPage() {
  const minDate = todayInNepal();

  return (
    <>
      <section className="hero-mesh border-b border-border/60">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <Badge variant="gold" className="rounded-full px-3 py-1">
              <CalendarDays className="size-3" /> Reservations
            </Badge>
            <h1 className="display-title mt-5 max-w-2xl">
              Your table,
              <br />
              <span className="text-gradient italic">waiting for you.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
              Tell us when you would like to come and how many are joining. Our
              team will confirm availability by phone or email.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card/70 p-3.5">
                <Clock className="size-4 text-primary" />
                <p className="mt-2 text-xs font-semibold">Open daily</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  9:00 AM – 10:00 PM
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3.5">
                <UsersRound className="size-4 text-primary" />
                <p className="mt-2 text-xs font-semibold">Up to 20 guests</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Online request
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-3.5">
                <MapPin className="size-4 text-primary" />
                <p className="mt-2 text-xs font-semibold">Airport Road</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Biratnagar 56613
                </p>
              </div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[5px] border-white/70 shadow-[var(--shadow-lift)] dark:border-white/10">
              <SmartImage
                src="/images/gallery/dining.jpg"
                alt="A table laid for dinner at Purple Haze"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 38vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 right-5 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Prefer to call?
              </p>
              <a
                href={`tel:${SITE.phoneRaw}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                <Phone className="size-3.5" /> {SITE.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-8">
            <p className="eyebrow">Request a table</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Tell us about your visit.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This is a request, not an instant confirmation. We will be in touch
              with availability.
            </p>
            <div className="mt-6">
              <ReservationForm minDate={minDate} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-semibold">
                What happens next
              </h2>
              <ol className="mt-5 space-y-5">
                {[
                  {
                    title: "Send your request",
                    copy: "Choose a date, time and guest count. Add any accessibility or occasion notes.",
                  },
                  {
                    title: "We check the tables",
                    copy: "Our team reviews availability for your preferred time and contacts you to confirm.",
                  },
                  {
                    title: "Come hungry",
                    copy: "Your table is held for your confirmed booking. Call us if plans change.",
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {step.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/40 p-6">
              <PartyPopper className="size-5 text-primary" />
              <h2 className="mt-3 font-display text-xl font-semibold">
                A bigger celebration?
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                For groups over 20, weddings, receptions and corporate events,
                our events team can suggest a venue and menu.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/events">Explore events &amp; venues</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-5 text-xs leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">Before you book</p>
              <p className="mt-1">
                Please mention allergies, accessibility requirements and whether
                you need garden seating. We will confirm what we can accommodate
                rather than make assumptions.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
