"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sound";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LiveOrderResponse {
  pendingCount: number;
  activeCount: number;
  overdueCount: number;
  newestPending: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    type: string;
    createdAt: string;
  } | null;
  latestUpdate: number;
  timestamp: number;
}

export function StaffLiveOrderListener() {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotify, setDesktopNotify] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const initialLoadRef = useRef(true);

  // Initialize preferences after mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const storedSound = localStorage.getItem("ph_staff_sound_enabled");
        if (storedSound !== null) {
          setSoundEnabled(storedSound === "true");
        }
        if (typeof window !== "undefined" && "Notification" in window) {
          setDesktopNotify(Notification.permission === "granted");
        }
      } catch {
        // Ignore localStorage error
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("ph_staff_sound_enabled", String(next));
    if (next) {
      sound.playOrderDing();
      toast.success("Kitchen sound alerts enabled");
    } else {
      toast.info("Kitchen sound alerts muted");
    }
  };

  const testChime = () => {
    sound.playNewOrderChime();
    toast.success("Playing kitchen order bell chime");
  };

  const requestDesktopNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Desktop notifications are not supported by this browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setDesktopNotify(true);
        toast.success("Desktop notifications enabled for new orders.");
      } else {
        setDesktopNotify(false);
        toast.info("Desktop notifications were disabled.");
      }
    } catch {
      // Ignore error
    }
  };

  // Live Polling & Supabase Realtime
  useEffect(() => {
    let ignore = false;
    let realtimeClient: SupabaseClient | null = null;

    const poll = async () => {
      try {
        const res = await fetch("/api/admin/orders/live", {
          cache: "no-store",
        });
        if (!res.ok || ignore) return;

        const data: LiveOrderResponse = await res.json();
        setPendingCount(data.pendingCount);
        setOverdueCount(data.overdueCount);

        // Update document title badge
        if (data.pendingCount > 0) {
          document.title = `(${data.pendingCount}) 🔔 New Orders! | Purple Haze`;
        } else {
          document.title = "Orders | Purple Haze Admin";
        }

        // On initial load, set baseline
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          lastUpdateRef.current = data.latestUpdate;
          if (data.newestPending) {
            setLastOrderNumber(data.newestPending.orderNumber);
          }
          return;
        }

        // Detect new pending order
        const isNewOrder =
          data.newestPending &&
          data.newestPending.orderNumber !== lastOrderNumber;

        // Detect data change
        const hasDataChanged =
          data.latestUpdate > 0 && data.latestUpdate !== lastUpdateRef.current;

        if (isNewOrder && data.newestPending) {
          setLastOrderNumber(data.newestPending.orderNumber);
          lastUpdateRef.current = data.latestUpdate;

          // Sound alert
          if (soundEnabled) {
            sound.playNewOrderChime();
          }

          // Browser Toast
          toast.success(
            `🔔 New Order: ${data.newestPending.orderNumber} (${data.newestPending.customerName})`,
            {
              description: `${data.newestPending.type} · Tap to review & accept.`,
              duration: 10000,
              action: {
                label: "Review",
                onClick: () =>
                  router.push(`/admin/orders/${data.newestPending?.id}`),
              },
            },
          );

          // Desktop Notification
          if (desktopNotify && Notification.permission === "granted") {
            try {
              new Notification("New Order — Purple Haze", {
                body: `${data.newestPending.orderNumber}: ${data.newestPending.customerName} (${data.newestPending.type})`,
                icon: "/images/icon.png",
              });
            } catch {
              // Notification failed
            }
          }

          // Refresh the page data
          router.refresh();
        } else if (hasDataChanged) {
          lastUpdateRef.current = data.latestUpdate;
          router.refresh();
        }
      } catch {
        // Silently tolerate temporary network blip
      }
    };

    const connectRealtime = async () => {
      try {
        const authRes = await fetch("/api/v1/realtime/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!authRes.ok) return;

        const authJson = await authRes.json();
        const authData = authJson.data;
        if (!authData?.url || !authData?.anonKey || !authData?.token || ignore) return;

        const { createClient } = await import("@supabase/supabase-js");
        realtimeClient = createClient(authData.url, authData.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { params: { eventsPerSecond: 5 } },
        });

        await realtimeClient.realtime.setAuth(authData.token);
        if (ignore) {
          await realtimeClient.removeAllChannels();
          return;
        }

        const channel = realtimeClient.channel("admin-orders", {
          config: { private: true },
        });

        channel
          .on("broadcast", { event: "order.created" }, () => {
            void poll();
          })
          .on("broadcast", { event: "order.status_updated" }, () => {
            void poll();
          })
          .subscribe();
      } catch {
        // Fallback polling operates seamlessly
      }
    };

    poll();
    void connectRealtime();

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
  }, [soundEnabled, desktopNotify, lastOrderNumber, router]);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-3">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                pendingCount > 0
                  ? "animate-ping bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex size-3 rounded-full ${
                pendingCount > 0 ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <span className="text-xs font-semibold">
            {pendingCount > 0 ? (
              <span className="text-amber-800 dark:text-amber-300">
                {pendingCount} order{pendingCount === 1 ? "" : "s"} awaiting
                kitchen acceptance
              </span>
            ) : (
              <span className="text-emerald-800 dark:text-emerald-300">
                Live Kitchen Radar Active
              </span>
            )}
          </span>
        </div>

        {overdueCount > 0 ? (
          <Badge
            variant="red"
            className="flex items-center gap-1 animate-pulse text-[11px]"
          >
            <AlertTriangle className="size-3" />
            {overdueCount} waiting &gt; 10 min
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={soundEnabled ? "outline" : "ghost"}
          className={`h-8 gap-1.5 text-xs ${
            soundEnabled
              ? "border-primary/30 text-primary font-medium"
              : "text-muted-foreground"
          }`}
          onClick={toggleSound}
          title={soundEnabled ? "Mute kitchen sound" : "Enable kitchen sound"}
        >
          {soundEnabled ? (
            <Volume2 className="size-3.5" />
          ) : (
            <VolumeX className="size-3.5 text-muted-foreground" />
          )}
          {soundEnabled ? "Chime ON" : "Muted"}
        </Button>

        {soundEnabled ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={testChime}
            title="Test the kitchen bell speaker"
          >
            Test Chime
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={requestDesktopNotifications}
          title={
            desktopNotify
              ? "Desktop notifications active"
              : "Enable desktop notifications"
          }
        >
          {desktopNotify ? (
            <BellRing className="size-3.5 text-primary" />
          ) : (
            <Bell className="size-3.5" />
          )}
          <span className="hidden sm:inline">Desktop Alert</span>
        </Button>
      </div>
    </div>
  );
}
