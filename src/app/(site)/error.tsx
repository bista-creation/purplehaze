"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Phone, RefreshCw, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          Purple Haze
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
          We could not load this page
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
          The menu and ordering service may be temporarily unavailable. Please
          retry in a moment. If you are ordering now, call us and we will help
          directly.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => retry()}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/menu">
              <UtensilsCrossed className="size-4" aria-hidden />
              Browse menu
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`}>
              <Phone className="size-4" aria-hidden />
              Call the restaurant
            </a>
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
