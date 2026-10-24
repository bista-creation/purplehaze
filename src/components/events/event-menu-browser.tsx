"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Leaf,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { formatNPR } from "@/lib/money";
import { SITE } from "@/lib/constants";
import type { EventMenuPackage } from "@/lib/event-menus-store";

const CATEGORIES = [
  { id: "ALL", label: "All Packages" },
  { id: "Wedding", label: "Weddings" },
  { id: "Garden Party", label: "Garden BBQ & Lawn" },
  { id: "Birthday", label: "Birthdays" },
  { id: "Corporate", label: "Corporate & Hi-Tea" },
  { id: "Anniversary", label: "Vegetarian Banquets" },
];

export function EventMenuBrowser({
  packages,
}: {
  packages: EventMenuPackage[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(
    packages[0]?.id ?? null,
  );
  const [calculatorPackageId, setCalculatorPackageId] = useState<string>(
    packages[0]?.id ?? "",
  );
  const [guestCount, setGuestCount] = useState<number>(50);

  const filtered = packages.filter((pkg) => {
    if (selectedCategory === "ALL") return true;
    if (selectedCategory === "Anniversary") return pkg.isVegetarian;
    return pkg.eventType === selectedCategory;
  });

  const activeCalcPackage =
    packages.find((p) => p.id === calculatorPackageId) ?? packages[0];
  const estimatedTotal = activeCalcPackage
    ? activeCalcPackage.pricePerPerson * guestCount * 100
    : 0;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-16">
      {/* CATEGORY FILTER PILLS */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* PACKAGES SHOWCASE */}
      <div className="space-y-8">
        {filtered.map((pkg) => {
          const isExpanded = expandedId === pkg.id;
          const totalDishes = pkg.courses.reduce(
            (sum, c) => sum + c.items.length,
            0,
          );
          const whatsappUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
            `Hello Purple Haze Restro & Garden, I would like to inquire about the ${pkg.name} (NPR ${pkg.pricePerPerson}/plate) for our upcoming event.`,
          )}`;

          return (
            <article
              key={pkg.id}
              id={pkg.slug}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                {/* PHOTO & COVER */}
                <div className="relative min-h-[260px] sm:min-h-[320px] lg:min-h-full">
                  <SmartImage
                    src={pkg.image || "/images/venues/banquet-hall-setup.jpg"}
                    alt={pkg.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                  <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
                    <Badge variant="violet" className="backdrop-blur-md">
                      {pkg.eventType}
                    </Badge>
                    {pkg.isPopular ? (
                      <Badge variant="gold" className="backdrop-blur-md">
                        <Sparkles className="size-3" /> Most Popular
                      </Badge>
                    ) : null}
                    {pkg.isVegetarian ? (
                      <Badge variant="green" className="backdrop-blur-md">
                        <Leaf className="size-3" /> 100% Pure Veg
                      </Badge>
                    ) : null}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                      All-Inclusive Package
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-white sm:text-4xl">
                        {formatNPR(pkg.pricePerPerson * 100)}
                      </span>
                      <span className="text-xs text-white/70">/ person</span>
                    </div>
                    <p className="mt-1 text-xs text-white/80">
                      Minimum order: {pkg.minGuests} guests
                    </p>
                  </div>
                </div>

                {/* DETAILS & CONTENT */}
                <div className="flex flex-col justify-between p-6 sm:p-8">
                  <div>
                    <h2 className="font-display text-2xl font-bold sm:text-3xl">
                      {pkg.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-primary font-medium">
                      {pkg.tagline}
                    </p>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground sm:text-sm">
                      {pkg.description}
                    </p>

                    {/* BADGES & HIGHLIGHTS */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {pkg.badges.map((b) => (
                        <span
                          key={b}
                          className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground"
                        >
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* COURSES QUICK SUMMARY */}
                    <div className="mt-6 rounded-2xl border border-border/80 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {pkg.courses.length} Courses · {totalDishes} Selected
                          Dishes
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(pkg.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              Hide menu breakdown{" "}
                              <ChevronUp className="size-3.5" />
                            </>
                          ) : (
                            <>
                              View full course list{" "}
                              <ChevronDown className="size-3.5" />
                            </>
                          )}
                        </button>
                      </div>

                      {/* EXPANDED COURSES VIEW */}
                      {isExpanded ? (
                        <div className="mt-4 space-y-4 border-t border-border/60 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          {pkg.courses.map((course, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-primary">
                                {course.category}
                              </h4>
                              <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                                {course.items.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2"
                                  >
                                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {pkg.courses.map((c) => (
                            <span
                              key={c.category}
                              className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px]"
                            >
                              <Check className="size-3 text-primary" />
                              {c.category}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm">
                        <Link
                          href={`/events?package=${encodeURIComponent(
                            pkg.slug,
                          )}#enquire`}
                          className="gap-1.5"
                        >
                          <CalendarCheck className="size-4" /> Book this Package
                        </Link>
                      </Button>

                      <Button asChild variant="outline" size="sm">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                          <MessageCircle className="size-4 text-emerald-600" />
                          WhatsApp Menu
                        </a>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCalculatorPackageId(pkg.id);
                          const el = document.getElementById("budget-estimator");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Calculator className="size-3.5" /> Estimate Budget
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* INTERACTIVE PARTY BUDGET ESTIMATOR */}
      <section
        id="budget-estimator"
        className="scroll-mt-24 rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-lg sm:p-10"
      >
        <div className="max-w-2xl">
          <Badge variant="gold" className="rounded-full px-3 py-1 text-[10px]">
            <Calculator className="size-3" /> Party Budget Estimator
          </Badge>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            Estimate your celebration catering.
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground sm:text-sm">
            Slide guest counts to see instant per-plate pricing and banquet
            totals. All packages include luxury chafing dishes, premium
            melamine/ceramic cutlery, and buffet management staff.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="calculator-package"
                className="text-xs font-semibold text-foreground"
              >
                Select Event Menu Package:
              </label>
              <select
                id="calculator-package"
                value={calculatorPackageId}
                onChange={(e) => setCalculatorPackageId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-medium"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatNPR(pkg.pricePerPerson * 100)} / plate
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  Expected Guest Count:
                </span>
                <span className="font-display text-xl font-bold text-primary">
                  {guestCount} Guests
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="5"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-primary"
                aria-label="Expected guest count slider"
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>20 Guests (Intimate Gathering)</span>
                <span>250 Guests</span>
                <span>500+ Guests (Grand Reception)</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="font-semibold text-foreground">Staffing</p>
                <p className="mt-0.5 text-[11px]">Included with setup</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="font-semibold text-foreground">Cutlery &amp; Linen</p>
                <p className="mt-0.5 text-[11px]">Premium banquet tier</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="font-semibold text-foreground">Live Counters</p>
                <p className="mt-0.5 text-[11px]">Chef managed on site</p>
              </div>
            </div>
          </div>

          {/* ESTIMATION SUMMARY CARD */}
          <div className="rounded-2xl border border-primary/30 bg-background p-6 shadow-md">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Estimated Catering Investment
            </span>
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">
                Estimated Total (Before Venue Fees)
              </span>
              <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                {formatNPR(estimatedTotal)}
              </p>
            </div>

            <dl className="mt-5 space-y-2 border-t border-border/80 pt-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <dt>Package</dt>
                <dd className="font-medium text-foreground">
                  {activeCalcPackage?.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Rate per head</dt>
                <dd className="font-medium text-foreground">
                  {activeCalcPackage
                    ? formatNPR(activeCalcPackage.pricePerPerson * 100)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Guests count</dt>
                <dd className="font-medium text-foreground">
                  {guestCount} persons
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-2">
              <Button asChild className="w-full">
                <Link
                  href={`/events?package=${encodeURIComponent(
                    activeCalcPackage?.slug ?? "",
                  )}&guests=${guestCount}#enquire`}
                >
                  Book with this Estimate <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href={`tel:${SITE.phoneRaw}`}>
                  <Phone className="size-3.5" /> Call for Custom Quote
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
