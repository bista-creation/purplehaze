"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Heart,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Settings,
} from "lucide-react";
import { ACCOUNT_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

const icons = {
  "/account": LayoutDashboard,
  "/account/orders": ReceiptText,
  "/account/addresses": MapPin,
  "/account/favorites": Heart,
  "/account/bookings": CalendarCheck,
  "/account/settings": Settings,
} as const;

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account navigation">
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:flex lg:flex-col lg:gap-1">
        {ACCOUNT_NAV.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon =
            icons[item.href as keyof typeof icons] ?? LayoutDashboard;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors sm:min-h-12 lg:min-h-0 lg:flex-row lg:justify-start lg:gap-2.5 lg:px-3.5 lg:py-2.5 lg:text-left lg:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="w-full truncate lg:w-auto">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
