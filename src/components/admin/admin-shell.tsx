"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  History,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { AdminLiveMonitor } from "@/components/admin/admin-live-monitor";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_GROUPS, type Role } from "@/lib/constants";
import { clearPageCache } from "@/lib/clear-page-cache";
import { cn, getInitials } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  chart: BarChart3,
  bell: Bell,
  receipt: ReceiptText,
  calendarCheck: CalendarCheck2,
  calendar: CalendarDays,
  utensils: UtensilsCrossed,
  building: Building2,
  ticket: TicketPercent,
  users: Users,
  star: Star,
  mail: Mail,
  layout: LayoutTemplate,
  settings: Settings,
  shield: ShieldCheck,
  history: History,
  briefcase: Briefcase,
  sparkles: Sparkles,
} as const;

const STAFF_ALLOWED = new Set([
  "/admin",
  "/admin/career",
  "/admin/dispatch",
  "/admin/event-menus",
  "/admin/orders",
  "/admin/riders",
  "/admin/notifications",
  "/admin/reservations",
  "/admin/event-bookings",
  "/admin/reviews",
  "/admin/messages",
]);

export function AdminShell({
  user,
  unreadCount,
  children,
}: {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    role: Role;
  };
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => user.role === "ADMIN" || STAFF_ALLOWED.has(item.href),
    ),
  })).filter((group) => group.items.length > 0);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#170d24] text-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Logo variant="light" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Close admin navigation"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav
        aria-label="Admin navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon =
                  ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                        active
                          ? "bg-white/12 text-white shadow-sm"
                          : "text-white/60 hover:bg-white/7 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[17px]",
                          active
                            ? "text-gold"
                            : "text-white/45 group-hover:text-white/70",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/admin/notifications" && unreadCount > 0 ? (
                        <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-gold-foreground">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                      {active ? (
                        <ChevronRight className="size-3.5 text-gold" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="size-3.5" /> View public website
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-2.5">
          <Avatar className="size-9 border border-white/15">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {user.name ?? "Team member"}
            </p>
            <p className="truncate text-[10px] text-white/45">{user.email}</p>
          </div>
          <Badge
            variant={user.role === "ADMIN" ? "gold" : "violet"}
            className="px-1.5 text-[9px]"
          >
            {user.role}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f6f3fa] dark:bg-[#100918]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block print:hidden">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[17rem] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-white/85 px-4 backdrop-blur-xl dark:bg-[#170d24]/90 sm:px-6 print:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu className="size-5" />
          </Button>

          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Operations
            </p>
            <p className="truncate font-display text-sm font-semibold">
              Purple Haze Restro &amp; Garden · Biratnagar
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <AdminLiveMonitor unreadCount={unreadCount} />
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Website
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => {
                void (async () => {
                  await clearPageCache();
                  await signOut({ callbackUrl: "/" });
                })();
              }}
            >
              <LogOut className="size-[18px]" />
            </Button>
          </div>
        </header>

        <main id="main-content" className="p-4 sm:p-6 lg:p-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
