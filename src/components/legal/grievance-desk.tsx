import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";
import { GRIEVANCE_OFFICER } from "@/lib/legal";

export function GrievanceDesk() {
  return (
    <section
      id="grievance"
      aria-labelledby="grievance-heading"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-secondary/70 via-card to-card p-5 shadow-[var(--shadow-soft)] sm:p-7"
    >
      <Badge variant="gold" className="rounded-full px-3 py-1">
        <ShieldCheck className="size-3" /> Grievance &amp; Contact Desk
      </Badge>
      <h2
        id="grievance-heading"
        className="mt-4 font-display text-2xl font-semibold sm:text-3xl"
      >
        A direct escalation path.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
        If an order, payment, reservation or event booking has not been resolved
        by our team, contact our grievance officer. Please include your order
        number or booking reference so we can investigate quickly.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Grievance officer
          </p>
          <p className="mt-1 font-semibold">{GRIEVANCE_OFFICER.name}</p>
          <p className="text-xs text-muted-foreground">
            {GRIEVANCE_OFFICER.role}
          </p>
        </div>

        <a
          href={`tel:${GRIEVANCE_OFFICER.phoneRaw}`}
          className="rounded-2xl border border-border bg-card/80 p-4 transition hover:border-primary/40 hover:bg-card"
        >
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Phone className="size-3 text-primary" /> Direct phone
          </p>
          <p className="mt-1 font-semibold text-primary">
            {GRIEVANCE_OFFICER.phone}
          </p>
          <p className="text-xs text-muted-foreground">
            Call or WhatsApp during opening hours.
          </p>
        </a>

        <a
          href={`mailto:${SITE.email}`}
          className="rounded-2xl border border-border bg-card/80 p-4 transition hover:border-primary/40 hover:bg-card"
        >
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Mail className="size-3 text-primary" /> Email
          </p>
          <p className="mt-1 break-all font-semibold text-primary">
            {SITE.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Attach photos or payment references where relevant.
          </p>
        </a>

        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Clock className="size-3 text-primary" /> Response target
          </p>
          <p className="mt-1 font-semibold">{GRIEVANCE_OFFICER.responseTime}</p>
          <p className="text-xs text-muted-foreground">
            Complex payment reversals can depend on provider timelines.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 text-primary" />
          {SITE.address.line1}, {SITE.address.line2}, {SITE.address.country}
        </p>
        <Link
          href="/refund-and-cancellation"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Read the refund &amp; cancellation policy
        </Link>
      </div>
    </section>
  );
}
