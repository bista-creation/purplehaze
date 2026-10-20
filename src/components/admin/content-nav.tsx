"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageIcon, LayoutTemplate, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/content", label: "Overview", icon: LayoutTemplate, exact: true },
  {
    href: "/admin/content/gallery",
    label: "Gallery",
    icon: ImageIcon,
  },
  {
    href: "/admin/content/banners",
    label: "Banners",
    icon: LayoutTemplate,
  },
  {
    href: "/admin/content/testimonials",
    label: "Testimonials",
    icon: MessageSquareQuote,
  },
];

export function ContentNav() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
