"use client";

import { useState } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNPR } from "@/lib/money";
import { cn } from "@/lib/utils";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.RevenueChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);

const TopDishChart = nextDynamic(
  () => import("@/components/admin/dashboard-charts").then((mod) => mod.TopDishChart),
  {
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/40" />,
  },
);

interface DashboardAnalyticsSectionProps {
  chartData: Array<{ label: string; revenue: number; orders: number }>;
  topDishData: Array<{ name: string; quantity: number }>;
  pendingEvents: number;
  upcomingEventGuests: number;
}

export function DashboardAnalyticsSection({
  chartData,
  topDishData,
  pendingEvents,
  upcomingEventGuests,
}: DashboardAnalyticsSectionProps) {
  const [showMobile, setShowMobile] = useState(false);
  const totalPaidRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);

  return (
    <div className="mt-4">
      {/* Mobile Progressive Disclosure Toggle (< lg) */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobile((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={showMobile}
          aria-controls="secondary-analytics-panel"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                Revenue &amp; Kitchen Analytics
              </p>
              <p className="text-[11px] text-muted-foreground">
                7-day trends · Top selling dishes · Event pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span>{showMobile ? "Hide" : "Show"}</span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                showMobile && "rotate-180",
              )}
            />
          </div>
        </button>
      </div>

      {/* Analytics Content: Always visible on desktop (lg:), progressively disclosed on mobile (< lg) */}
      <div
        id="secondary-analytics-panel"
        className={cn(
          "space-y-4",
          !showMobile && "hidden lg:block",
          showMobile && "mt-3 lg:mt-0",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {/* 7-Day Revenue Area Chart */}
          <AdminCard className="p-4 sm:p-5 xl:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold sm:text-xl">
                  Last seven days
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verified paid revenue, with daily order counts.
                </p>
              </div>
              <Badge variant="green" className="w-fit">
                {formatNPR(totalPaidRevenue)} paid
              </Badge>
            </div>
            <div className="mt-4 min-w-0">
              <RevenueChart data={chartData} />
            </div>
          </AdminCard>

          {/* Kitchen Favorites 30-Day Bar Chart */}
          <AdminCard className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold sm:text-xl">
                  Kitchen favourites
                </h2>
                <p className="text-xs text-muted-foreground">
                  Top dishes, last 30 days.
                </p>
              </div>
              <ChefHat className="size-5 text-primary shrink-0" />
            </div>
            {topDishData.length > 0 ? (
              <div className="mt-4 min-w-0">
                <TopDishChart data={topDishData} />
              </div>
            ) : (
              <div className="mt-4 grid h-[250px] place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                Dish sales will appear after the first orders.
              </div>
            )}
          </AdminCard>
        </div>

        {/* Events Pipeline Strip */}
        <AdminCard className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold sm:text-lg">
                  Event Enquiries &amp; Pipeline
                </h2>
                <p className="text-xs text-muted-foreground">
                  {pendingEvents} enquiry awaiting reply · {upcomingEventGuests} guest capacity booked this month.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/admin/event-bookings">
                Manage event enquiries <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
