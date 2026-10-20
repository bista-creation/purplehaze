"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

export default function AdminError({
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
    <div className="mx-auto max-w-2xl py-8">
      <AdminCard className="p-8 text-center sm:p-12">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold">
          Dashboard data could not load
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          This can happen during a database restart or a brief connection
          interruption. The live queue falls back to polling when Realtime is
          unavailable; no order state was changed by this error.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => retry()}>
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">
              <LayoutDashboard className="size-4" aria-hidden />
              Dashboard home
            </Link>
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-5 text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </AdminCard>
    </div>
  );
}
