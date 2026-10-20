"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PUBLIC_NAV, SITE } from "@/lib/constants";
import { cartCount, useCartStore } from "@/lib/cart-store";
import { clearPageCache } from "@/lib/clear-page-cache";
import { useMounted } from "@/lib/use-mounted";
import { cn, getInitials } from "@/lib/utils";
import { isStaffRole } from "@/lib/roles";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.openCart);
  const count = mounted ? cartCount(items) : 0;
  const user = session?.user as HeaderUser | undefined;
  const signedIn = status === "authenticated" && Boolean(user);
  const staff = signedIn && isStaffRole(user?.role ?? undefined);

  const handleSignOut = async () => {
    await clearPageCache();
    await signOut({ callbackUrl: "/" });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="hidden border-b border-border/50 bg-ink text-white lg:block">
        <div className="container-page flex h-9 items-center justify-between text-[11px] tracking-wide">
          <div className="flex items-center gap-5 text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3 text-gold" aria-hidden />
              {SITE.address.line1}, {SITE.address.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3 text-gold" aria-hidden />
              Open daily · {SITE.hours}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/reservations"
              className="inline-flex items-center gap-1.5 text-white/80 transition hover:text-gold"
            >
              <CalendarDays className="size-3" aria-hidden />
              Reserve a table
            </Link>
            <a
              href={`tel:${SITE.phoneRaw}`}
              className="inline-flex items-center gap-1.5 font-medium text-gold transition hover:text-white"
            >
              <Phone className="size-3" aria-hidden />
              {SITE.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="container-page flex h-[4.5rem] items-center justify-between gap-2 sm:gap-4">
        <Logo className="shrink-0" />

        <nav aria-label="Main navigation" className="hidden xl:flex">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-secondary/70 hover:text-primary",
                    isActive(item.href) ? "text-primary" : "text-foreground/75",
                  )}
                >
                  {item.label}
                  {isActive(item.href) ? (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />
          {staff ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden h-9 gap-1.5 border-primary/20 bg-primary/[0.04] px-3 text-primary hover:bg-primary/10 lg:inline-flex"
            >
              <Link href="/admin">
                <ShieldCheck className="size-3.5" />
                Dashboard
              </Link>
            </Button>
          ) : null}
          <UserMenu
            user={user}
            signedIn={signedIn}
            loading={status === "loading"}
            onSignOut={() => void handleSignOut()}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openCart}
            aria-label={`Open cart${count ? `, ${count} items` : ""}`}
          >
            <ShoppingBag className="size-[19px]" />
            {mounted && count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-gold-foreground">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </Button>
          <Button asChild className="hidden md:inline-flex" size="sm">
            <Link href="/menu">Order online</Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col overflow-y-auto">
              <SheetHeader>
                <SheetTitle asChild>
                  <Logo />
                </SheetTitle>
                <SheetDescription>
                  Good food, garden evenings and celebrations in Biratnagar.
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pt-4">
                {signedIn && user ? (
                  <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-secondary/80 via-card to-gold/10 p-4">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={user} className="size-11" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {user.name ?? "Purple Haze guest"}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {user.email}
                        </p>
                        {staff ? (
                          <Badge variant="violet" className="mt-1.5">
                            <ShieldCheck className="size-3" />
                            {user.role === "ADMIN" ? "Administrator" : "Staff"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href="/account"
                          onClick={() => setMobileOpen(false)}
                        >
                          <UserRound className="size-3.5" /> My account
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href="/account/orders"
                          onClick={() => setMobileOpen(false)}
                        >
                          <ReceiptText className="size-3.5" /> My orders
                        </Link>
                      </Button>
                    </div>
                    {staff ? (
                      <Button asChild className="mt-2 w-full" size="sm">
                        <Link
                          href="/admin"
                          onClick={() => setMobileOpen(false)}
                        >
                          <LayoutDashboard className="size-3.5" />
                          {user.role === "ADMIN"
                            ? "Open admin dashboard"
                            : "Open staff dashboard"}
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 w-full justify-start text-muted-foreground"
                      onClick={() => {
                        setMobileOpen(false);
                        void handleSignOut();
                      }}
                    >
                      <LogOut className="size-3.5" /> Sign out
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-semibold">
                      Save your favourites and orders
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Sign in to your account or create a new one in a moment.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button asChild size="sm">
                        <Link
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                        >
                          <LogIn className="size-3.5" /> Sign in
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href="/register"
                          onClick={() => setMobileOpen(false)}
                        >
                          <UserPlus className="size-3.5" /> Register
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <nav
                aria-label="Mobile navigation"
                className="flex flex-1 flex-col px-4 pt-3"
              >
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-secondary text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-4 h-px bg-border" />
                <Link
                  href="/reservations"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
                >
                  <CalendarDays className="size-4 text-primary" /> Reserve a
                  table
                </Link>
                <a
                  href={`tel:${SITE.phoneRaw}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
                >
                  <Phone className="size-4 text-primary" /> {SITE.phone}
                </a>
                <div className="mt-auto space-y-3 border-t py-5">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/menu" onClick={() => setMobileOpen(false)}>
                      Order online
                    </Link>
                  </Button>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">
                      Open daily · 9 AM – 10 PM
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  user,
  signedIn,
  loading,
  onSignOut,
}: {
  user?: HeaderUser;
  signedIn: boolean;
  loading: boolean;
  onSignOut: () => void;
}) {
  if (loading) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="Loading account"
        disabled
      >
        <UserRound className="size-[19px] animate-pulse" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={signedIn ? "Open account menu" : "Sign in or register"}
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-full transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            signedIn
              ? "bg-[conic-gradient(from_140deg,#f5b942,#7c3aed,#5b21b6,#f5b942)] p-[2px] shadow-[0_6px_18px_-8px_rgba(91,33,182,0.8)]"
              : "hover:bg-secondary",
          )}
        >
          {signedIn && user ? (
            <ProfileAvatar
              user={user}
              className="size-full border-2 border-background"
            />
          ) : (
            <UserRound className="size-[19px]" />
          )}
          {signedIn ? (
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {signedIn && user ? (
          <>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 p-2">
                <ProfileAvatar user={user} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.name ?? "Purple Haze guest"}
                  </p>
                  <p className="truncate text-[11px] font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserRound className="size-4" /> My account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders">
                <ReceiptText className="size-4" /> My orders
              </Link>
            </DropdownMenuItem>
            {isStaffRole(user.role ?? undefined) ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  className="bg-primary/5 font-semibold text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                    {user.role === "ADMIN"
                      ? "Admin dashboard"
                      : "Staff dashboard"}
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onSignOut();
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">Your account</p>
              <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                Sign in or create an account to order faster.
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogIn className="size-4" /> Sign in
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/register">
                <UserPlus className="size-4" /> Create account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/track">
                <ReceiptText className="size-4" /> Track an order
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileAvatar({
  user,
  className,
}: {
  user: HeaderUser;
  className?: string;
}) {
  return (
    <Avatar className={cn("border border-border bg-card", className)}>
      {user.image ? (
        <AvatarImage
          src={user.image}
          alt={user.name ?? "Profile photo"}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
