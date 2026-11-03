"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bike,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
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
import { LiveDeliveryMap } from "@/components/orders/live-delivery-map";

export interface DispatchDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  total: number;
  orderStatus: string;
  deliveryStatus: string;
  provider: string;
  paymentMethod: string;
  rider: {
    id: string;
    name: string | null;
    phone: string | null;
    vehicleType: string;
  } | null;
  otpLocked: boolean;
  otpAttempts: number;
  assignedAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  arrivedAt: string | null;
  isStuckAssigned: boolean;
  failureReason: string | null;
  items: Array<{ name: string; quantity: number }>;
}

export interface UndispatchedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number }>;
}

export interface OnDutyRider {
  id: string;
  name: string | null;
  phone: string | null;
  vehicleType: string;
  activeDeliveriesCount: number;
  licenseStatus: string;
}

export function DispatchBoard({
  initialDeliveries,
  initialUndispatched,
  riders: initialRiders,
  isAdmin,
}: {
  initialDeliveries: DispatchDelivery[];
  initialUndispatched: UndispatchedOrder[];
  riders: OnDutyRider[];
  isAdmin: boolean;
}) {
  const [deliveries, setDeliveries] = useState<DispatchDelivery[]>(initialDeliveries);
  const [undispatched, setUndispatched] = useState<UndispatchedOrder[]>(initialUndispatched);
  const [riders, setRiders] = useState<OnDutyRider[]>(initialRiders);
  const [refreshing, setRefreshing] = useState(false);

  // Dispatch modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UndispatchedOrder | DispatchDelivery | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tracking modal
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingDelivery, setTrackingDelivery] = useState<DispatchDelivery | null>(null);
  const [riderLocation, setRiderLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt?: string;
    isStale?: boolean;
  } | null>(null);

  // Override modal (Admin only)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideDelivery, setOverrideDelivery] = useState<DispatchDelivery | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("DELIVERED");
  const [overrideReason, setOverrideReason] = useState("");

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [delivRes, ridersRes] = await Promise.all([
        fetch("/api/v1/admin/deliveries"),
        fetch("/api/v1/admin/riders"),
      ]);

      const delivData = await delivRes.json();
      const ridersData = await ridersRes.json();

      if (delivData.success) {
        setDeliveries(delivData.data.deliveries);
        setUndispatched(delivData.data.undispatchedOrders);
      }
      if (ridersData.success && Array.isArray(ridersData.data)) {
        setRiders(
          ridersData.data.filter(
            (r: { shiftStatus: string; licenseStatus: string; isBlocked?: boolean }) =>
              r.shiftStatus === "ON_DUTY" && r.licenseStatus === "VERIFIED" && !r.isBlocked
          )
        );
      }
    } catch {
      toast.error("Failed to refresh live dispatch data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(loadData, 15000); // Poll every 15s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!trackingModalOpen || !trackingDelivery) return;
    let active = true;

    const fetchLoc = async () => {
      try {
        const res = await fetch(`/api/v1/orders/${trackingDelivery.orderId}/location`);
        if (!res.ok) return;
        const resData = await res.json();
        if (active && resData.success && resData.data?.location) {
          setRiderLocation(resData.data.location);
        }
      } catch {
        // ignore
      }
    };

    void fetchLoc();
    const interval = setInterval(fetchLoc, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [trackingModalOpen, trackingDelivery]);

  const handleOpenDispatch = (order: UndispatchedOrder | DispatchDelivery) => {
    setSelectedOrder(order);
    setSelectedRiderId(riders[0]?.id || "");
    setDispatchModalOpen(true);
  };

  const handleDispatchSubmit = async () => {
    if (!selectedOrder || !selectedRiderId) {
      toast.error("Please select a rider");
      return;
    }
    setSubmitting(true);
    try {
      const orderId = "orderId" in selectedOrder ? selectedOrder.orderId : selectedOrder.id;
      const res = await fetch("/api/v1/admin/deliveries/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          riderProfileId: selectedRiderId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Dispatched order ${selectedOrder.orderNumber}! 120s acceptance timer started.`);
        setDispatchModalOpen(false);
        loadData();
      } else {
        toast.error(data.error?.message || "Failed to dispatch order");
      }
    } catch {
      toast.error("Network error during dispatch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockOtp = async (deliveryId: string, orderNumber: string) => {
    try {
      const res = await fetch(`/api/v1/admin/deliveries/${deliveryId}/otp-unlock`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`OTP unlocked for ${orderNumber}. Fresh code generated.`);
        loadData();
      } else {
        toast.error(data.error?.message || "Failed to unlock OTP");
      }
    } catch {
      toast.error("Network error unlocking OTP");
    }
  };

  const handleAcknowledgeFoodReturn = async (deliveryId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/deliveries/${deliveryId}/acknowledge-return`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Food return to kitchen acknowledged");
        loadData();
      } else {
        toast.error(data.error?.message || "Failed to acknowledge food return");
      }
    } catch {
      toast.error("Network error acknowledging food return");
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideDelivery) return;
    if (!overrideReason || overrideReason.trim().length < 5) {
      toast.error("Please provide a written reason (min 5 characters)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/deliveries/${overrideDelivery.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: overrideStatus,
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Delivery status overridden to ${overrideStatus}`);
        setOverrideModalOpen(false);
        setOverrideReason("");
        loadData();
      } else {
        toast.error(data.error?.message || "Override failed");
      }
    } catch {
      toast.error("Network error submitting override");
    } finally {
      setSubmitting(false);
    }
  };

  const assignedDeliveries = deliveries.filter((d) => d.deliveryStatus === "ASSIGNED");
  const inTransitDeliveries = deliveries.filter((d) =>
    ["ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"].includes(d.deliveryStatus)
  );
  const issueDeliveries = deliveries.filter((d) =>
    ["TIMEOUT", "DECLINED", "FAILED"].includes(d.deliveryStatus) || d.isStuckAssigned
  );

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            {riders.length} Riders On Duty
          </Badge>
          <Badge variant="outline" className="border-violet-500/40 text-violet-400">
            {inTransitDeliveries.length + assignedDeliveries.length} Active Trips
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={refreshing}
          className="h-8 text-xs"
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh Board
        </Button>
      </div>

      {/* Grid columns */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Column 1: Ready to Dispatch */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ready to Dispatch ({undispatched.length})
            </h3>
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            {undispatched.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No orders waiting for rider assignment.
              </p>
            ) : (
              undispatched.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {ord.orderNumber}
                      </span>
                      <p className="text-xs font-medium">{ord.customerName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {ord.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{ord.deliveryAddress || "Airport Road Area"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="text-xs font-semibold text-emerald-400">
                      Rs. {ord.total.toFixed(0)} ({ord.paymentMethod})
                    </span>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
                      onClick={() => handleOpenDispatch(ord)}
                    >
                      <Send className="mr-1 size-3" /> Assign Rider
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In-Transit Deliveries */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              In-Transit & Assigned ({assignedDeliveries.length + inTransitDeliveries.length})
            </h3>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-3">
            {assignedDeliveries.length === 0 && inTransitDeliveries.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No riders currently on the road.
              </p>
            ) : (
              [...assignedDeliveries, ...inTransitDeliveries].map((deliv) => {
                const isAssigned = deliv.deliveryStatus === "ASSIGNED";
                const isArrived = deliv.deliveryStatus === "ARRIVED_AT_CUSTOMER";

                return (
                  <div
                    key={deliv.id}
                    className={`rounded-xl border p-3 space-y-2.5 ${
                      deliv.isStuckAssigned
                        ? "border-rose-500/50 bg-rose-500/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {deliv.orderNumber}
                        </span>
                        <p className="text-xs font-medium">{deliv.customerName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={
                            isAssigned
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]"
                              : isArrived
                              ? "border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px]"
                              : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                          }
                        >
                          {deliv.deliveryStatus}
                        </Badge>
                        {deliv.isStuckAssigned && (
                          <span className="text-[10px] text-rose-400 font-semibold animate-pulse">
                            ⚠️ &gt;3m in Assigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Bike className="size-3.5 text-primary" />
                      <span className="font-medium text-foreground">
                        {deliv.rider?.name || "Unassigned"}
                      </span>
                      {deliv.rider?.phone && (
                        <span className="font-mono text-[11px]">({deliv.rider.phone})</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <span className="text-muted-foreground">
                        {deliv.paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid"}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              setTrackingDelivery(deliv);
                              setRiderLocation(null);
                              setTrackingModalOpen(true);
                            }}
                          >
                            <Navigation className="size-2.5" /> Track
                          </Button>
                          {deliv.otpLocked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => handleUnlockOtp(deliv.id, deliv.orderNumber)}
                          >
                            <Lock className="mr-1 size-2.5" /> Unlock OTP
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setOverrideDelivery(deliv);
                              setOverrideModalOpen(true);
                            }}
                          >
                            Override
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Exceptions & Attention Required */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Needs Attention ({issueDeliveries.length})
            </h3>
            <AlertTriangle className="size-3.5 text-rose-400" />
          </div>

          <div className="space-y-3">
            {issueDeliveries.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                All deliveries running smoothly. No issues or timeouts.
              </p>
            ) : (
              issueDeliveries.map((deliv) => (
                <div
                  key={deliv.id}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {deliv.orderNumber}
                      </span>
                      <p className="font-medium text-foreground">{deliv.customerName}</p>
                    </div>
                    <Badge variant="red" className="text-[10px]">
                      {deliv.deliveryStatus}
                    </Badge>
                  </div>

                  {deliv.failureReason && (
                    <p className="text-[11px] text-rose-300">
                      <span className="font-semibold">Reason: </span>
                      {deliv.failureReason}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-rose-500/30">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {deliv.customerPhone}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {deliv.deliveryStatus === "FAILED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                          onClick={() => handleAcknowledgeFoodReturn(deliv.id)}
                        >
                          Food Returned
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs bg-primary hover:bg-primary/90"
                        onClick={() => handleOpenDispatch(deliv)}
                      >
                        Re-Dispatch
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-border"
                          onClick={() => {
                            setOverrideDelivery(deliv);
                            setOverrideModalOpen(true);
                          }}
                        >
                          Override
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dispatch / Re-dispatch Modal */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Delivery Rider</DialogTitle>
            <DialogDescription>
              Select an on-duty rider with verified driver documents. A 120-second acceptance timer will be initiated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Order: </span>
                <span className="font-semibold">{selectedOrder?.orderNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Customer: </span>
                <span>{selectedOrder?.customerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Address: </span>
                <span>{selectedOrder?.deliveryAddress || "Biratnagar area"}</span>
              </div>
            </div>

            <FormField label="Available On-Duty Riders" required>
              {riders.length === 0 ? (
                <div className="p-3 text-center text-xs text-rose-400 bg-rose-500/10 rounded-lg">
                  No riders currently on duty. Riders must toggle ON DUTY from their app.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {riders.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedRiderId === r.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="riderSelection"
                          checked={selectedRiderId === r.id}
                          onChange={() => setSelectedRiderId(r.id)}
                        />
                        <div>
                          <p className="font-semibold text-foreground">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.vehicleType} • {r.phone}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {r.activeDeliveriesCount} active
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </FormField>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDispatchSubmit}
                disabled={submitting || riders.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Dispatching...
                  </>
                ) : (
                  "Confirm Dispatch (120s timer)"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Emergency Override Modal */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Administrative Delivery Override</DialogTitle>
            <DialogDescription>
              Emergency tool for restaurant administrators. Every override requires a written justification and is recorded in the immutable audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <FormField label="Target Delivery Status" required>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
              >
                <option value="DELIVERED">DELIVERED (Force Complete)</option>
                <option value="FAILED">FAILED (Record Incident)</option>
                <option value="PICKED_UP">PICKED_UP (Food Left Kitchen)</option>
                <option value="DECLINED">DECLINED (Return to Pool)</option>
              </select>
            </FormField>

            <FormField label="Mandatory Justification / Reason" required>
              <Input
                placeholder="e.g. Customer verified delivery over phone; rider battery died"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleOverrideSubmit}
                disabled={submitting || overrideReason.trim().length < 5}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Overriding...
                  </>
                ) : (
                  "Execute Admin Override"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Rider Tracking Modal */}
      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Navigation className="size-4 text-primary" />
              <span>Rider Live Telemetry • {trackingDelivery?.orderNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live GPS feed from on-duty rider app. Telemetry auto-refreshes every 8s.
            </DialogDescription>
          </DialogHeader>

          {trackingDelivery && (
            <div className="p-4 pt-2">
              <LiveDeliveryMap
                riderLocation={riderLocation}
                destinationAddress={trackingDelivery.deliveryAddress}
                orderNumber={trackingDelivery.orderNumber}
                riderName={trackingDelivery.rider?.name}
                riderPhone={trackingDelivery.rider?.phone}
                compact
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
