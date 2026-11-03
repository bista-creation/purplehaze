import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { SettlementsAdmin } from "@/components/admin/settlements-admin";
import { requireStaff } from "@/lib/security";
import { settlementService } from "@/lib/services/settlement.service";
import { todayInNepal } from "@/lib/time";

export const metadata: Metadata = { title: "Rider Settlements" };
export const dynamic = "force-dynamic";

export default async function AdminSettlementsPage() {
  await requireStaff("/admin/settlements");

  const todayStr = todayInNepal();
  const result = await settlementService.listSettlementsForDate(todayStr);

  const summary = result.success && result.data
    ? result.data
    : {
        dateStr: todayStr,
        totalCodExpectedPaisa: 0,
        totalCashierCountPaisa: 0,
        totalDifferencePaisa: 0,
        settlements: [],
      };

  return (
    <>
      <AdminPageHeader
        eyebrow="Fleet & Accounting"
        title="Rider Settlements"
        description="Daily cash reconciliation for delivery riders. Reconcile expected COD cash against physical cash received at cashier desk."
      />
      <SettlementsAdmin
        initialDate={todayStr}
        initialSummary={summary}
      />
    </>
  );
}
