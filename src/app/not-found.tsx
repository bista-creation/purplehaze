import Link from "next/link";
import { Home, SearchX, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page grid min-h-[65vh] place-items-center py-16">
      <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <SearchX className="size-6" aria-hidden />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          This page is not on the menu
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          The link may be outdated, or the page may have moved. Browse the menu
          or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/menu">
              <UtensilsCrossed className="size-4" aria-hidden />
              Browse menu
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" aria-hidden />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
