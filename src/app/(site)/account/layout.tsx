import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AccountNav } from "@/components/account/account-nav";
import { AccountSignOutButton } from "@/components/account/account-sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/security";
import { isStaffRole } from "@/lib/security";
import { getInitials } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "My account",
    template: "%s | My account | Purple Haze",
  },
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="border-b border-border/60 bg-muted/20">
      <div className="container-page py-4 sm:py-8 lg:py-12">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="min-w-0 lg:sticky lg:top-32">
            <div className="rounded-2xl border border-border bg-card p-3.5 shadow-[0_18px_50px_-40px_rgba(76,29,149,0.55)] sm:p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[conic-gradient(from_140deg,#f5b942,#7c3aed,#5b21b6,#f5b942)] p-[2px]">
                  <Avatar className="size-11 border-2 border-card sm:size-12">
                    {user.image ? (
                      <AvatarImage
                        src={user.image}
                        alt={user.name ?? "Profile"}
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold sm:text-lg">
                    {user.name ?? "Purple Haze guest"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    {user.email}
                  </p>
                  {isStaffRole(user.role) ? (
                    <Badge variant="violet" className="mt-1.5">
                      <ShieldCheck className="size-3" />
                      {user.role === "ADMIN" ? "Administrator" : "Staff"}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-3.5">
                <AccountNav />
              </div>
              <div className="mt-3 space-y-2 border-t pt-3 sm:mt-4 sm:pt-4">
                {isStaffRole(user.role) ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-10 w-full justify-center border-primary/20 bg-primary/[0.04] text-primary hover:bg-primary/10 lg:justify-start"
                  >
                    <Link href="/admin">
                      <ShieldCheck className="size-4" />
                      {user.role === "ADMIN"
                        ? "Admin dashboard"
                        : "Staff dashboard"}
                    </Link>
                  </Button>
                ) : null}
                <AccountSignOutButton />
              </div>
            </div>

            <div className="mt-4 hidden rounded-2xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground lg:block">
              <p className="font-semibold text-foreground">Need help?</p>
              <p className="mt-1">
                Call{" "}
                <a
                  href={`tel:${SITE.phoneRaw}`}
                  className="font-medium text-primary"
                >
                  {SITE.phone}
                </a>{" "}
                during opening hours.
              </p>
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
