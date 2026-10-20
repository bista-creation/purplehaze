"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
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
    <main
      id="main-content"
      className="container-page grid min-h-[60vh] place-items-center py-16"
    >
      <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          We could not load this page. Your cart and account are safe. Try
          again, or call us if you were part-way through an order.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => retry()}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" aria-hidden />
              Home
            </Link>
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-5 text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
