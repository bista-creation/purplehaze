import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/constants";
import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

export type LegalSection = {
  title: string;
  body: string[];
  bullets?: string[];
};

export function LegalPage({
  current,
  eyebrow,
  title,
  intro,
  updated,
  sections = [],
  children,
}: {
  current: string;
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  sections?: LegalSection[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <section className="hero-mesh border-b border-border/60 py-12 lg:py-16">
        <div className="container-page max-w-6xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-title mt-4 max-w-4xl text-3xl sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {intro}
          </p>
          {updated ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Last updated: {updated}
            </p>
          ) : null}
        </div>
      </section>

      <section className="container-page max-w-6xl py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav
              aria-label="Policies and legal"
              className="rounded-2xl border border-border bg-card p-3 sm:p-4"
            >
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Policies &amp; Legal
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {LEGAL_LINKS.map((item) => {
                  const active = current === item.href.split("#")[0];
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-lg px-2.5 py-2 text-xs leading-5 transition",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">Need help?</p>
              <p className="mt-1">
                Call{" "}
                <a href={`tel:${SITE.phoneRaw}`} className="text-primary">
                  {SITE.phone}
                </a>{" "}
                or email{" "}
                <a
                  href={`mailto:${SITE.email}`}
                  className="break-all text-primary"
                >
                  {SITE.email}
                </a>
                .
              </p>
              <Link
                href="/contact#grievance"
                className="mt-2 inline-block font-semibold text-primary underline underline-offset-4"
              >
                Grievance &amp; contact desk
              </Link>
            </div>
          </aside>

          <article className="min-w-0">
            {sections.length ? (
              <div className="space-y-9">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="font-display text-2xl font-semibold">
                      {section.title}
                    </h2>
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-3 text-sm leading-7 text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                        {section.bullets.map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <span
                              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : null}

            {children}

            <div className="mt-10 rounded-2xl border border-border bg-card p-5 text-sm leading-7">
              <h2 className="font-display text-xl font-semibold">Contact us</h2>
              <address className="mt-2 space-y-2 not-italic text-muted-foreground">
                <p className="flex gap-2.5">
                  <MapPin className="mt-1 size-4 shrink-0 text-primary" />
                  <span>
                    {SITE.address.line1}, {SITE.address.line2}
                    <br />
                    {SITE.address.state}, {SITE.address.country}
                  </span>
                </p>
                <a
                  href={`tel:${SITE.phoneRaw}`}
                  className="flex items-center gap-2.5 transition hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" />
                  {SITE.phone}
                </a>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-2.5 break-all transition hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-primary" />
                  {SITE.email}
                </a>
              </address>
              <p className="mt-3 text-xs text-muted-foreground">
                For a formal complaint, use our{" "}
                <Link
                  href="/contact#grievance"
                  className="text-primary underline underline-offset-4"
                >
                  grievance and contact desk
                </Link>
                .
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
