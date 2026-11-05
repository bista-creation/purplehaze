"use client";

import { useEffect, useRef, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
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
  "/admin/settlements",
  "/admin/notifications",
  "/admin/reservations",
  "/admin/event-bookings",
  "/admin/reviews",
  "/admin/messages",
]);

const STORAGE_SIDEBAR_COLLAPSED = "ph-admin-sidebar-collapsed";

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED) === "1";
  } catch {
    return false;
  }
}

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, next ? "1" : "0");
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  const closeDrawer = () => {
    setMobileOpen(false);
    triggerRef.current?.focus();
  };

  // Handle escape key and focus restoration for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile drawer is open and focus close button
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileOpen]);

  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => user.role === "ADMIN" || STAFF_ALLOWED.has(item.href),
    ),
  })).filter((group) => group.items.length > 0);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // Sidebar component for both desktop (expanded/collapsed) and mobile drawer
  const renderNav = (isDrawer = false, collapsed = false) => (
    <div className="flex h-full flex-col bg-[#170d24] text-white">
      {/* Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "justify-between px-4 sm:px-5",
        )}
      >
        {collapsed ? (
          <Link
            href="/admin"
            title="Purple Haze Admin"
            className="flex size-10 items-center justify-center rounded-xl bg-gold/15 font-display text-lg font-bold text-gold ring-1 ring-gold/30 hover:bg-gold/25"
          >
            PH
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Logo variant="light" />
          </div>
        )}

        {isDrawer ? (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Close navigation menu"
          >
            <X className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "hidden rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white lg:grid",
              collapsed ? "size-8 place-items-center mt-1" : "size-8 place-items-center",
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav
        aria-label="Admin navigation"
        className={cn(
          "flex-1 overflow-y-auto py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {groups.map((group) => (
          <div key={group.label} className={collapsed ? "mb-3" : "mb-5"}>
            {!collapsed ? (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>
            ) : (
              <div className="my-2 h-px bg-white/10" aria-hidden="true" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon =
                  ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
                const active = isActive(item.href);
                const hasNotification =
                  item.href === "/admin/notifications" && unreadCount > 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (isDrawer) closeDrawer();
                      }}
                      title={collapsed ? `${item.label}${hasNotification ? ` (${unreadCount} unread)` : ""}` : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                        collapsed
                          ? "size-11 justify-center mx-auto"
                          : "gap-3 px-3 py-2.5",
                        active
                          ? "bg-white/12 text-white shadow-sm"
                          : "text-white/60 hover:bg-white/7 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active
                            ? "text-gold"
                            : "text-white/45 group-hover:text-white/70",
                        )}
                      />
                      {!collapsed ? (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {hasNotification ? (
                            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-gold-foreground">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          ) : null}
                          {active ? (
                            <ChevronRight className="size-3.5 text-gold shrink-0" />
                          ) : null}
                        </>
                      ) : (
                        hasNotification ? (
                          <span className="absolute right-1 top-1 size-2 rounded-full bg-gold ring-2 ring-[#170d24]" />
                        ) : null
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer User Info */}
      <div className={cn("border-t border-white/10 p-3", collapsed && "p-2")}>
        {!collapsed && (
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ExternalLink className="size-3.5" /> View public website
          </Link>
        )}
        <div
          className={cn(
            "flex items-center rounded-xl bg-white/[0.06] p-2",
            collapsed ? "justify-center" : "gap-3 p-2.5",
          )}
          title={collapsed ? `${user.name ?? "Team member"} (${user.role})` : undefined}
        >
          <Avatar className="size-8 sm:size-9 border border-white/15 shrink-0">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary text-white text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.name ?? "Team member"}
                </p>
                <p className="truncate text-[10px] text-white/45">{user.email}</p>
              </div>
              <Badge
                variant={user.role === "ADMIN" ? "gold" : "violet"}
                className="px-1.5 text-[9px] shrink-0"
              >
                {user.role}
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f6f3fa] dark:bg-[#100918]">
      {/* Persistent / Collapsible Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-all duration-200 lg:block print:hidden",
          sidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        {renderNav(false, sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer (accessible modal dialog) */}
      {mobileOpen ? (
        <div
          id="admin-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* Backdrop with outside tap close */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-label="Close navigation backdrop"
            onClick={closeDrawer}
          />

          {/* Drawer container */}
          <aside className="absolute inset-y-0 left-0 w-[18rem] max-w-[85vw] shadow-2xl">
            {renderNav(true, false)}
          </aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-all duration-200 print:pl-0",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b border-border/70 bg-white/85 px-3 backdrop-blur-xl dark:bg-[#170d24]/90 sm:gap-3 sm:px-6 print:hidden">
          {/* Hamburger button on mobile */}
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="admin-navigation-drawer"
            aria-label="Open admin navigation menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Header Title with Mobile Support */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
                Purple Haze <span className="hidden xs:inline">Restro &amp; Garden</span>
              </p>
              <Badge variant="outline" className="hidden py-0 text-[10px] sm:inline-flex">
                Biratnagar
              </Badge>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
              Operations Floor
            </p>
          </div>

          {/* Header Actions: Notifications, Live Monitor, Theme & Sign Out */}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <AdminLiveMonitor unreadCount={unreadCount} />
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
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

        <main id="main-content" className="p-3 sm:p-6 lg:p-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
