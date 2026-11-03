"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Truck,
  Volume2,
  VolumeX,
  XCircle,
  Compass,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sound";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

interface StatusHistoryEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

interface OrderLiveStatus {
  id?: string;
  orderNumber: string;
  status: string;
  type: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  deliveryAddress: string | null;
  tableNumber: string | null;
  createdAt: string;
  acceptedAt: string | null;
  scheduledFor: string | null;
  progress: number;
  statusMeta: {
    label: string;
    description: string;
    tone: string;
  };
  remainingMinutes: number | null;
  deliveryOtp?: string | null;
  itemsCount: number;
  history: StatusHistoryEntry[];
}

const deliverySteps = [
  { key: "PENDING", label: "Placed", icon: ShoppingBag },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Cooking", icon: Flame },
  { key: "OUT_FOR_DELIVERY", label: "On the way", icon: Truck },
  { key: "COMPLETED", label: "Delivered", icon: Sparkles },
];

const pickupSteps = [
  { key: "PENDING", label: "Placed", icon: ShoppingBag },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Cooking", icon: Flame },
  { key: "READY", label: "Ready", icon: Sparkles },
  { key: "COMPLETED", label: "Completed", icon: Check },
];

export function RealtimeOrderTracker({
  initialOrderNumber,
  initialStatus,
  initialType,
  token,
}: {
  initialOrderNumber: string;
  initialStatus: string;
  initialType: string;
  token?: string | null;
}) {
  const [data, setData] = useState<OrderLiveStatus | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(
    initialStatus === "CONFIRMED"
      ? 35
      : initialStatus === "PREPARING"
        ? 65
        : initialStatus === "READY"
          ? 85
          : initialStatus === "OUT_FOR_DELIVERY"
            ? 90
            : initialStatus === "COMPLETED"
              ? 100
              : 10,
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt: string;
    isStale: boolean;
  } | null>(null);
  const prevStatusRef = useRef(initialStatus);

  const isActive = !["COMPLETED", "CANCELLED"].includes(status);
  const steps = initialType === "DELIVERY" ? deliverySteps : pickupSteps;

  const fetchStatus = async (showManualFeedback = false) => {
    try {
      if (showManualFeedback) setIsRefreshing(true);
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(
        `/api/orders/${encodeURIComponent(initialOrderNumber)}/status${query}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;

      const live: OrderLiveStatus = await res.json();
      setData(live);
      setProgress(live.progress);

      // Check if status changed
      if (live.status !== prevStatusRef.current) {
        prevStatusRef.current = live.status;
        setStatus(live.status);

        if (soundEnabled) {
          sound.playOrderDing();
        }

        toast.success(`Status updated: ${live.statusMeta.label}!`, {
          description: live.statusMeta.description,
          duration: 6000,
        });
      }

      if (showManualFeedback) {
        toast.info("Status refreshed with live kitchen feed.");
      }
    } catch {
      // Tolerate brief network glitch
    } finally {
      if (showManualFeedback) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const poll = async () => {
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(
          `/api/orders/${encodeURIComponent(initialOrderNumber)}/status${query}`,
          { cache: "no-store" },
        );
        if (!res.ok || ignore) return;

        const live: OrderLiveStatus = await res.json();
        if (ignore) return;
        setData(live);
        setProgress(live.progress);
        setStatus(live.status);

        if (prevStatusRef.current !== live.status) {
          prevStatusRef.current = live.status;
          if (soundEnabled) {
            if (live.status === "COMPLETED") {
              sound.playOrderDing();
            } else if (
              live.status === "CONFIRMED" ||
              live.status === "PREPARING"
            ) {
              sound.playNewOrderChime();
            } else {
              sound.playOrderDing();
            }
          }
          toast.success(live.statusMeta.label, {
            description: live.statusMeta.description,
          });
        }
      } catch {
        // Tolerate brief network glitch
      }
    };

    poll();
    if (!isActive) return;

    let realtimeClient: ReturnType<typeof createClient> | null = null;
    const connectRealtime = async () => {
      try {
        const authRes = await fetch("/api/v1/realtime/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: initialOrderNumber, publicToken: token }),
        });
        if (!authRes.ok) return;
        const resJson = await authRes.json();
        const authData = resJson.data;
        if (!authData?.url || !authData?.anonKey || !authData?.token || ignore) return;

        realtimeClient = createClient(authData.url, authData.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { params: { eventsPerSecond: 5 } },
        });

        await realtimeClient.realtime.setAuth(authData.token);
        if (ignore) {
          await realtimeClient.removeAllChannels();
          return;
        }

        const trackingChannel = authData.channels?.find((ch: string) => ch.startsWith("orders:"));
        if (trackingChannel) {
          realtimeClient
            .channel(trackingChannel)
            .on("broadcast", { event: "order.status_updated" }, () => {
              void poll();
            })
            .subscribe();
        }

        // Phase 4: Subscribe to Rider Location Channel when order is out for delivery
        if (data?.id && data.status === "OUT_FOR_DELIVERY") {
          try {
            const locRes = await fetch(`/api/v1/orders/${data.id}/location`, {
              headers: token ? { "x-order-token": token } : {},
            });
            const locJson = await locRes.json();
            if (locJson.success && locJson.data?.location) {
              setRiderLocation(locJson.data.location);
            }
          } catch {
            // Ignore initial loc fetch error
          }

          try {
            const trackTokenRes = await fetch(`/api/v1/realtime/token?orderId=${data.id}`, {
              headers: token ? { "x-order-token": token } : {},
            });
            const trackTokenJson = await trackTokenRes.json();
            if (trackTokenJson.enabled && trackTokenJson.token && trackTokenJson.channel) {
              realtimeClient
                .channel(trackTokenJson.channel)
                .on(
                  "broadcast",
                  { event: "rider.location" },
                  ({ payload }: { payload?: { lat: number; lng: number; updatedAt: string } }) => {
                    if (payload) {
                      setRiderLocation({
                        lat: payload.lat,
                        lng: payload.lng,
                        updatedAt: payload.updatedAt,
                        isStale: false,
                      });
                    }
                  }
                )
                .subscribe();
            }
          } catch {
            // Ignore realtime track subscription error
          }
        }
      } catch {
        // Fallback polling continues seamlessly
      }
    };

    void connectRealtime();

    // Poll every 10 seconds as authoritative fallback
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        poll();
      }
    }, 10_000);

    return () => {
      ignore = true;
      clearInterval(timer);
      if (realtimeClient) {
        void realtimeClient.removeAllChannels();
      }
    };
  }, [isActive, initialOrderNumber, token, soundEnabled, data?.id, data?.status]);

  const currentIndex = steps.findIndex((s) => s.key === status);
  const activeStepIndex =
    status === "READY" && initialType === "DELIVERY"
      ? 2 // Ready for delivery maps right around cooking stage
      : currentIndex >= 0
        ? currentIndex
        : status === "COMPLETED"
          ? steps.length - 1
          : 0;

  const whatsappText = `Hello Purple Haze Restro & Garden, I am checking the status of my order ${initialOrderNumber}.`;
  const whatsappUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    whatsappText,
  )}`;

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-b from-card via-card to-primary/5 p-6 shadow-md sm:p-8">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex size-4 items-center justify-center">
            {isActive ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </>
            ) : status === "COMPLETED" ? (
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            ) : (
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {isActive ? "Realtime Kitchen Radar" : "Order Archive"}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {initialOrderNumber}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isActive
                ? "Live sync enabled · auto-refreshes every 4s"
                : "Order completed. Thank you!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground"
            title={soundEnabled ? "Mute status chimes" : "Enable status chimes"}
          >
            {soundEnabled ? (
              <Volume2 className="size-3.5 text-primary" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? "Sound ON" : "Muted"}
            </span>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => fetchStatus(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* HERO STATUS BANNER */}
      <div className="my-6">
        {status === "PENDING" &&
        data?.paymentMethod &&
        data.paymentMethod !== "COD" &&
        data.paymentStatus !== "PAID" ? (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <CreditCard className="size-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-amber-950 dark:text-amber-100">
                  Awaiting online payment...
                </h2>
                <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-200/80">
                  Please complete your payment above. Your order will be sent
                  straight to the kitchen as soon as payment is confirmed.
                </p>
              </div>
            </div>
          </div>
        ) : status === "PENDING" ? (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Clock className="size-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-amber-950 dark:text-amber-100">
                  Received! Awaiting kitchen confirmation...
                </h2>
                <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-200/80">
                  Our staff is reviewing your order details. The chef will accept
                  and start prep right away.
                </p>
              </div>
            </div>
          </div>
        ) : status === "CONFIRMED" ? (
          <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                  Order confirmed by kitchen!
                </h2>
                <p className="mt-1 text-xs leading-5 text-emerald-900/80 dark:text-emerald-200/80">
                  Ingredients are being prepared. Cooking will begin shortly in
                  the Purple Haze kitchen.
                </p>
              </div>
            </div>
          </div>
        ) : status === "PREPARING" ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
                  <Flame className="size-5 animate-bounce" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Chef is cooking your dishes!
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Freshly made with Himalayan herbs and garden spices.
                  </p>
                </div>
              </div>
              {data?.remainingMinutes ? (
                <div className="rounded-xl border border-primary/20 bg-background/80 px-4 py-2.5 text-right shadow-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Est. Kitchen Time
                  </span>
                  <p className="font-display text-xl font-bold text-primary">
                    ~{data.remainingMinutes} min
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : status === "READY" ? (
          <div className="rounded-2xl border border-blue-300/80 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-blue-950 dark:text-blue-100">
                  Freshly cooked and packed!
                </h2>
                <p className="mt-1 text-xs leading-5 text-blue-900/80 dark:text-blue-200/80">
                  {initialType === "DELIVERY"
                    ? "Your order is packed in thermal containers and awaiting rider dispatch."
                    : initialType === "DINE_IN"
                      ? "Dishes are on their way to your garden table!"
                      : "Your package is waiting at the Purple Haze counter for pickup."}
                </p>
              </div>
            </div>
          </div>
        ) : status === "OUT_FOR_DELIVERY" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-300/80 bg-indigo-50/80 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  <Truck className="size-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-indigo-950 dark:text-indigo-100">
                    On the way to your door!
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-indigo-900/80 dark:text-indigo-200/80">
                    Our delivery rider has left Airport Road and is navigating to your address.
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Verification PIN Box */}
            {data?.deliveryOtp && (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-1.5 shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <KeyRound className="size-4" />
                  <span>Your Delivery Verification PIN</span>
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                  {data.deliveryOtp}
                </div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Provide this 6-digit PIN to the rider upon arrival to securely confirm food handover.
                </p>
              </div>
            )}

            {/* Live Rider Location & Map Widget */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="size-4 text-primary animate-spin" />
                  <span className="text-sm font-semibold text-foreground">
                    Live Rider Tracking
                  </span>
                </div>
                {riderLocation ? (
                  <Badge
                    variant={riderLocation.isStale ? "amber" : "green"}
                    className="text-[10px]"
                  >
                    {riderLocation.isStale ? "Location updating..." : "Live GPS (12s)"}
                  </Badge>
                ) : (
                  <Badge variant="muted" className="text-[10px]">
                    Connecting GPS...
                  </Badge>
                )}
              </div>

              {riderLocation?.isStale && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                  Rider location updating... (Signal may be weak or phone locked in transit).
                </p>
              )}

              <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">From: </span>
                    <span className="text-muted-foreground">
                      Purple Haze Restro & Garden, Airport Road, Biratnagar
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">To: </span>
                    <span className="text-muted-foreground">
                      {data?.deliveryAddress || "Customer address"}
                    </span>
                  </div>
                </div>
              </div>

              {riderLocation && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Rider GPS: {riderLocation.lat.toFixed(4)}, {riderLocation.lng.toFixed(4)}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${riderLocation.lat}%2C${riderLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Google Maps →
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <Check className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                  Order Completed!
                </h2>
                <p className="mt-1 text-xs leading-5 text-emerald-900/80 dark:text-emerald-200/80">
                  Thank you for dining with Purple Haze Restro & Garden. We hope
                  you enjoy every bite!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-300/80 bg-red-50/80 p-5 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-700 dark:text-red-300">
                <XCircle className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-red-950 dark:text-red-100">
                  Order Cancelled
                </h2>
                <p className="mt-1 text-xs leading-5 text-red-900/80 dark:text-red-200/80">
                  This order has been cancelled. For refunds or enquiries,
                  contact our team below.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PROGRESS TRACKER BAR */}
      {status !== "CANCELLED" ? (
        <div className="my-8">
          <div className="relative mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={cn(
                      "grid size-8 sm:size-10 place-items-center rounded-full border text-xs font-semibold transition-all duration-300",
                      isPast
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-background text-primary ring-4 ring-primary/20 scale-105"
                          : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {isPast ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[10px] sm:text-xs font-medium line-clamp-1",
                      isCurrent
                        ? "font-bold text-primary"
                        : isPast
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* QUICK ASSISTANCE & DIRECT CONTACT */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <a href={`tel:${SITE.phoneRaw}`}>
              <Phone className="size-3.5 text-primary" />
              Call Restaurant
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-3.5 text-emerald-600" />
              WhatsApp Us
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-primary" />
          <span>Airport Road, Biratnagar</span>
        </div>
      </div>
    </div>
  );
}
