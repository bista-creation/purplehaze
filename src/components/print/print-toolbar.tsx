"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintToolbar({
  title,
  subtitle,
  backHref,
  paperLinks = [],
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  paperLinks?: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <div className="print-toolbar no-print">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-slate-900">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {paperLinks.map((link) => (
          <Button
            key={link.href}
            asChild
            size="sm"
            variant={link.active ? "default" : "outline"}
            className={cn(
              !link.active &&
                "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          className="bg-slate-900 text-white hover:bg-slate-700"
        >
          <Printer className="size-4" /> Print
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>
    </div>
  );
}
