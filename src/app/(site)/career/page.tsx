import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowDown,
  Award,
  BadgeCheck,
  Briefcase,
  ChefHat,
  Clock,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { CareerApplicationForm } from "@/components/forms/career-application-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { getActiveVacancies } from "@/lib/careers-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hospitality Careers & Job Opportunities in Biratnagar",
  description:
    "Explore restaurant and hospitality job opportunities in Biratnagar, Nepal. Purple Haze Restro & Garden is hiring Chefs, Baristas, Bartenders, Waiters, Kitchen Stewards & Supervisors on Airport Road. Apply with your CV today!",
  keywords: [
    "Jobs in Biratnagar",
    "Hospitality jobs Nepal",
    "Restaurant jobs in Biratnagar",
    "Chef vacancy Biratnagar",
    "Waiter jobs Nepal",
    "Barista job Biratnagar",
    "Purple Haze Restro careers",
    "Hotel management jobs Koshi Province",
    "Airport Road Biratnagar vacancies",
  ],
  alternates: {
    canonical: "/career",
  },
  openGraph: {
    title: "Hospitality Careers & Job Vacancies | Purple Haze Restro & Garden",
    description:
      "Join our passionate team in Biratnagar. Competitive salaries, nutritious staff meals, skills training, and a respectful garden work environment.",
    url: `${SITE.url}/career`,
    siteName: SITE.name,
    locale: "en_US",
    type: "website",
  },
};

const perks = [
  {
    icon: Award,
    title: "Competitive Compensation & Tips",
    desc: "Fair, timely monthly salaries complemented by service charge distributions and tip sharing.",
  },
  {
    icon: UtensilsCrossed,
    title: "Complimentary Staff Meals",
    desc: "Freshly prepared, wholesome meals and tea served daily during every work shift.",
  },
  {
    icon: ChefHat,
    title: "Skill Mentorship & Growth",
    desc: "Hands-on training from senior chefs, beverage consultants, and hospitality veterans.",
  },
  {
    icon: ShieldCheck,
    title: "Respectful Work Environment",
    desc: "A positive, safe, and collaborative team culture where every contribution is valued.",
  },
  {
    icon: Clock,
    title: "Predictable Full-Time Rosters",
    desc: "Structured full-time shifts with scheduled weekly days off and public festival allowances.",
  },
  {
    icon: HeartHandshake,
    title: "Fast-Track Promotions",
    desc: "We prioritize internal promotions for dedicated staff seeking long-term hospitality careers.",
  },
];

export default async function CareerPage() {
  const jobOpenings = await getActiveVacancies();

  // Structured JSON-LD schema for search engines (Jobs in Biratnagar)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: jobOpenings.map((job, idx) => ({
      "@type": "JobPosting",
      position: idx + 1,
      title: job.title,
      description: job.description,
      datePosted: job.createdAt.slice(0, 10),
      employmentType: "FULL_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: SITE.name,
        sameAs: SITE.url,
        logo: `${SITE.url}/images/branding/logo.png`,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.address.line1,
          addressLocality: SITE.address.city,
          addressRegion: SITE.address.state,
          postalCode: SITE.address.line2,
          addressCountry: "NP",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero Section */}
      <section className="hero-mesh relative overflow-hidden border-b border-border/60 py-16 lg:py-24">
        <div
          className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-gold/10 blur-3xl"
          aria-hidden
        />

        <div className="container-page relative">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="gold" className="rounded-full px-3.5 py-1 text-xs">
              <Sparkles className="size-3" /> Careers in Biratnagar
            </Badge>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5 text-primary" /> Airport Road, Biratnagar
            </span>
          </div>

          <h1 className="display-title mt-6 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Build your hospitality career at{" "}
            <span className="text-gradient italic">Purple Haze Restro & Garden.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Biratnagar&apos;s premier garden restaurant, banquet hall, and meeting place is expanding.
            We are looking for passionate, full-time professionals who take pride in exceptional
            food, craft beverages, and warm Nepali hospitality.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="rounded-xl px-6">
              <a href="#apply">
                <Briefcase className="size-4" /> Apply for a Position
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl px-6">
              <a href="#openings">
                <ArrowDown className="size-4" /> View Open Roles ({jobOpenings.length})
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Work With Us Section */}
      <section className="border-b border-border/50 bg-secondary/30 py-16 lg:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              <UsersRound className="size-3" /> Life At Purple Haze
            </Badge>
            <h2 className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
              Why work with our Biratnagar team?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              We believe great dining experiences start with a happy, well-supported team.
              Here is what you can look forward to as part of the Purple Haze family.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
                    {perk.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {perk.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions Section (Dynamic) */}
      <section id="openings" className="container-page scroll-mt-24 py-16 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge variant="gold" className="rounded-full px-3 py-1 text-xs">
              <Briefcase className="size-3" /> Active Vacancies
            </Badge>
            <h2 className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
              Current Job Opportunities in Biratnagar
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Explore available positions across our culinary, bar, dining service, and operations teams.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Location: Airport Road, Biratnagar • Full-time Only
          </span>
        </div>

        {jobOpenings.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Briefcase className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="font-display mt-4 text-lg font-semibold">No active vacancies right now</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We are not actively advertising specific roles at this moment, but we always welcome talented hospitality applicants. Feel free to submit your CV below.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobOpenings.map((job) => (
              <div
                key={job.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:border-primary/50 hover:shadow-lg"
              >
                {job.image ? (
                  <div className="relative h-44 w-full overflow-hidden bg-muted">
                    <Image
                      src={job.image}
                      alt={job.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition duration-300 hover:scale-105"
                      unoptimized={
                        !job.image.startsWith("/") &&
                        !job.image.includes("unsplash.com") &&
                        !job.image.includes("vercel-storage.com") &&
                        !job.image.includes("cloudinary.com")
                      }
                    />
                    <div className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {job.type}
                    </div>
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {job.department}
                    </span>
                    {!job.image ? (
                      <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {job.type}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
                    {job.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="size-3.5" /> {job.experience}
                    </span>
                    {job.salary ? (
                      <span className="text-muted-foreground">• {job.salary}</span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {job.description}
                  </p>

                  {job.skills && job.skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto p-6 pt-0">
                  <div className="pt-4 border-t border-border/60">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full justify-center rounded-xl font-medium hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <a href="#apply">Apply for this role</a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Application Form & Direct Contact Section */}
      <section id="apply" className="scroll-mt-20 border-t border-border/60 bg-muted/20 py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            {/* Left Contact & Hiring Guidelines */}
            <div className="space-y-6">
              <div>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  <ChefHat className="size-3" /> Join Our Family
                </Badge>
                <h2 className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
                  Submit Your Job Application
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  Fill out the form with your details, tell us about your experience, and attach your
                  CV / resume. Our hiring team in Biratnagar reviews all submissions and will invite
                  shortlisted candidates for an interview.
                </p>
              </div>

              {/* Direct visit & walk-in box */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Walk-In or Inquire Directly
                </h3>
                <p className="text-xs leading-5 text-muted-foreground">
                  Prefer to deliver your resume in person or have questions regarding working hours? You are always welcome to stop by our venue.
                </p>

                <div className="space-y-3 pt-2 text-sm text-foreground">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {SITE.address.line1}, {SITE.address.line2}
                      <br />
                      {SITE.address.city}, {SITE.address.state}, {SITE.address.country}
                    </span>
                  </div>

                  <a
                    href={`tel:${SITE.phoneRaw}`}
                    className="flex items-center gap-3 text-muted-foreground transition hover:text-primary"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span>{SITE.phone} (General Inquiries)</span>
                  </a>

                  <a
                    href={`https://wa.me/${SITE.whatsapp}?text=Hello%20Purple%20Haze%2C%20I%20am%20inquiring%20about%20job%20openings.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-muted-foreground transition hover:text-primary"
                  >
                    <MessageCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp: +977 9851150987</span>
                  </a>
                </div>

                <div className="rounded-xl bg-secondary/70 p-3 text-xs leading-5 text-muted-foreground">
                  <strong className="text-foreground">Walk-in Interview Hours:</strong> Sunday – Friday, 11:00 AM to 4:00 PM. Please bring your citizenship card and printed CV.
                </div>
              </div>
            </div>

            {/* Right Interactive Form Box */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6 border-b border-border/60 pb-5">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Online Job Application Form
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  All fields marked with an asterisk (<span className="text-rose-500">*</span>) are required. All openings are for <strong className="text-foreground">Full-time</strong> positions.
                </p>
              </div>

              <CareerApplicationForm
                availablePositions={jobOpenings.map((job) => job.title)}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
