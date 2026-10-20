import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Headphones, PackageCheck, ShieldCheck } from "lucide-react";
import { TrackOrderForm } from "@/components/orders/track-order-form";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Follow your Purple Haze order from the kitchen to your table, door or pickup counter.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <section className="hero-mesh border-b border-border/60">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
        <div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Back to menu
          </Link>
          <p className="eyebrow mt-8">From our kitchen to you</p>
          <h1 className="display-title mt-3 max-w-xl">
            Track your order,
            <br />
            <span className="text-gradient italic">step by step.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground">
            Enter the order number from your confirmation email and the phone
            number used at checkout. We will take you to the live order page.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { icon: PackageCheck, label: "Live status" },
              { icon: ShieldCheck, label: "Private link" },
              { icon: Headphones, label: "Team support" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2.5 text-xs font-medium"
              >
                <item.icon className="size-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h2 className="font-display text-2xl font-semibold">
            Find my order
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your details are used only to open this order.
          </p>
          <div className="mt-6">
            <TrackOrderForm initialOrder={order} />
          </div>
          <div className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
            Having trouble? Call{" "}
            <a
              href={`tel:${SITE.phoneRaw}`}
              className="font-semibold text-primary"
            >
              {SITE.phone}
            </a>{" "}
            or{" "}
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary"
            >
              message us on WhatsApp
            </a>
            .
          </div>
        </div>
      </div>
      <div className="container-page pb-10">
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Ordered without an account? You can still track and review your
            order with the details above.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/account/orders">View account orders</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
