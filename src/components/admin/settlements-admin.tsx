"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export interface SettlementRow {
  settlementId: string | null;
  riderId: string;
  riderName: string | null;
  riderPhone: string | null;
  riderEmail: string;
  shiftStatus: string;
  ordersDeliveredCount: number;
  codOrdersCount: number;
  codExpectedPaisa: number;
  riderReportedPaisa: number;
  cashierCountPaisa: number;
  differencePaisa: number;
  status: "PENDING" | "RECONCILED" | "DISCREPANCY";
  handoversCount: number;
  reconciledAt: string | null;
  reconciledByName: string | null;
  notes: string | null;
}

export interface SettlementsAdminProps {
  initialDate: string;
  initialSummary: {
    totalCodExpectedPaisa: number;
    totalCashierCountPaisa: number;
    totalDifferencePaisa: number;
    settlements: SettlementRow[];
  };
}

export function formatRupees(paisa: number): string {
  const rs = paisa / 100;
  return rs.toLocaleString("en-IN", {
    minimumFractionDigits: rs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function SettlementsAdmin({ initialDate, initialSummary }: SettlementsAdminProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(initialSummary);

  // Handover modal state
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<SettlementRow | null>(null);
  const [handoverAmountRs, setHandoverAmountRs] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [submittingHandover, setSubmittingHandover] = useState(false);

  const loadSettlements = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/settlements?date=${dateStr}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data);
      } else {
        toast.error(json.error?.message || "Failed to load settlements");
      }
    } catch {
      toast.error("Network error loading settlements");
    } finally {
      setLoading(false);
    }
  };

  const openHandoverModal = (row: SettlementRow) => {
    setSelectedRider(row);
    // Default to remaining expected COD if any (in Rupees)
    const remainingPaisa = Math.max(0, row.codExpectedPaisa - row.cashierCountPaisa);
    const remainingRs = remainingPaisa / 100;
    setHandoverAmountRs(
      remainingPaisa > 0
        ? (remainingRs % 1 === 0 ? remainingRs.toFixed(0) : remainingRs.toFixed(2))
        : ""
    );
    setHandoverNotes("");
    setHandoverModalOpen(true);
  };

  const handleRecordHandover = async () => {
    if (!selectedRider?.settlementId) {
      toast.error("No active settlement ID for this rider yet.");
      return;
    }

    const amountRs = parseFloat(handoverAmountRs);
    if (isNaN(amountRs) || amountRs <= 0) {
      toast.error("Please enter a valid cash amount in Rupees.");
      return;
    }

    setSubmittingHandover(true);
    try {
      const res = await fetch(`/api/v1/admin/settlements/${selectedRider.settlementId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaisa: Math.round(amountRs * 100),
          notes: handoverNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Cash handover recorded successfully");
        setHandoverModalOpen(false);
        await loadSettlements(selectedDate);
      } else {
        toast.error(json.error?.message || "Failed to record handover");
      }
    } catch {
      toast.error("Network error recording cash handover");
    } finally {
      setSubmittingHandover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">
              Asia/Kathmandu Cash Ledger
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Settlements calculated strictly midnight-to-midnight (UTC+05:45). All amounts in Nepalese Rupees (NPR).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDate(val);
                if (val) loadSettlements(val);
              }}
              className="bg-transparent text-foreground focus:outline-none text-xs font-mono"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => loadSettlements(selectedDate)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Expected COD Total</span>
            <Banknote className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">
            Rs. {formatRupees(summary.totalCodExpectedPaisa)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Calculated from completed Cash on Delivery orders
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cash Received by Cashier</span>
            <Coins className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {formatRupees(summary.totalCashierCountPaisa)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Confirmed handovers entered into register
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Discrepancy / Balance</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              summary.totalDifferencePaisa === 0
                ? "text-emerald-500"
                : summary.totalDifferencePaisa < 0
                ? "text-rose-500"
                : "text-amber-500"
            }`}
          >
            {summary.totalDifferencePaisa > 0 ? "+" : ""}
            Rs. {formatRupees(summary.totalDifferencePaisa)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {summary.totalDifferencePaisa === 0
              ? "All active settlements balanced"
              : summary.totalDifferencePaisa < 0
              ? "Pending cash collection from riders"
              : "Excess cash recorded in handovers"}
          </p>
        </div>
      </div>

      {/* Rider Settlements Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Rider Cash Ledgers ({summary.settlements.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Individual reconciliation status for each delivery rider.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Rider</th>
                <th className="py-3 px-4 font-semibold text-center">Deliveries</th>
                <th className="py-3 px-4 font-semibold text-center">COD Orders</th>
                <th className="py-3 px-4 font-semibold text-right">Expected COD</th>
                <th className="py-3 px-4 font-semibold text-right">Cashier Count</th>
                <th className="py-3 px-4 font-semibold text-right">Difference</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {summary.settlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No riders or deliveries recorded for {selectedDate}.
                  </td>
                </tr>
              ) : (
                summary.settlements.map((row) => (
                  <tr key={row.riderId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground">{row.riderName || "Rider"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {row.riderPhone || row.riderEmail}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      {row.ordersDeliveredCount}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      {row.codOrdersCount}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      Rs. {formatRupees(row.codExpectedPaisa)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      Rs. {formatRupees(row.cashierCountPaisa)}
                    </td>

                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        row.differencePaisa === 0
                          ? "text-emerald-500"
                          : row.differencePaisa < 0
                          ? "text-rose-500"
                          : "text-amber-500"
                      }`}
                    >
                      {row.differencePaisa > 0 ? "+" : ""}
                      Rs. {formatRupees(row.differencePaisa)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          row.status === "RECONCILED"
                            ? "green"
                            : row.status === "DISCREPANCY"
                            ? "red"
                            : "amber"
                        }
                        className="text-[10px]"
                      >
                        {row.status === "RECONCILED" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {row.status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
                        {row.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {row.settlementId ? (
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
                          onClick={() => openHandoverModal(row)}
                        >
                          Record Handover
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          No deliveries
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Handover Modal */}
      <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Cash Handover</DialogTitle>
            <DialogDescription>
              Record physical cash received from {selectedRider?.riderName || "rider"} at the cashier desk.
            </DialogDescription>
          </DialogHeader>

          {selectedRider && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rider:</span>
                  <span className="font-semibold text-foreground">{selectedRider.riderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected COD Today:</span>
                  <span className="font-mono font-bold text-foreground">
                    Rs. {formatRupees(selectedRider.codExpectedPaisa)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previously Received:</span>
                  <span className="font-mono text-emerald-500 font-semibold">
                    Rs. {formatRupees(selectedRider.cashierCountPaisa)}
                  </span>
                </div>
              </div>

              <FormField label="Cash Amount Received (Rs.)" required>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={handoverAmountRs}
                  onChange={(e) => setHandoverAmountRs(e.target.value)}
                  className="font-mono text-base"
                />
              </FormField>

              <FormField label="Cashier Notes (Optional)">
                <Input
                  placeholder="e.g. Counter 1 handover, evening shift end"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHandoverModalOpen(false)}
              disabled={submittingHandover}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleRecordHandover}
              disabled={submittingHandover}
            >
              {submittingHandover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Cash Handover"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
