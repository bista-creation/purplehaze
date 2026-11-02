"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  Bell,
  BellRing,
  Check,
  Loader2,
  RefreshCw,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type LiveStatus = "connecting" | "live" | "polling" | "offline";

type RealtimeNotification = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  link?: string | null;
  isTest?: boolean;
};

const STORAGE_SOUND = "ph-admin-notification-sound";
const STORAGE_DESKTOP = "ph-admin-desktop-alerts";

function readPreference(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writePreference(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Preferences are optional; notification delivery must still work.
  }
}

function playBeep() {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Audio is optional and may be blocked by the browser.
  }
}

function statusCopy(status: LiveStatus) {
  switch (status) {
    case "live":
      return "Live updates connected";
    case "polling":
      return "Polling fallback";
    case "offline":
      return "Offline";
    default:
      return "Connecting";
  }
}

function safeAdminLink(link: string | null | undefined) {
  if (typeof link !== "string") return null;
  return /^\/admin(?:\/|$)/.test(link) && !link.includes("\\") ? link : null;
}

/**
 * Desktop notifications are visible outside the authenticated admin UI. Only
 * a safe order reference or event category is allowed in the system title.
 * Customer names, phone numbers, addresses, totals and notes never go there.
 */
function browserAlertTitle(payload: RealtimeNotification) {
  const orderNumber = payload.title?.match(/\bPH-[A-Z0-9-]+\b/i)?.[0];
  if (orderNumber) return `Order ${orderNumber.toUpperCase()}`;
  switch (payload.type) {
    case "ORDER":
      return "Order update";
    case "PAYMENT":
      return "Payment update";
    case "RESERVATION":
      return "Reservation request";
    case "EVENT":
      return "Event enquiry";
    case "REVIEW":
      return "New review";
    default:
      return "Admin notification";
  }
}

export function AdminLiveMonitor({
  fallbackIntervalMs = 30_000,
  unreadCount = 0,
}: {
  fallbackIntervalMs?: number;
  unreadCount?: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [manualPending, startManualRefresh] = useTransition();
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    // Defer the first read until after hydration so server and client markup
    // match; the control becomes accurate immediately afterwards.
    const timer = window.setTimeout(() => {
      setSoundEnabled(readPreference(STORAGE_SOUND));
      setDesktopEnabled(
        readPreference(STORAGE_DESKTOP) &&
          "Notification" in window &&
          Notification.permission === "granted",
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(
    (immediate = false) => {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      if (!immediate && document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefresh(new Date());
    },
    [router],
  );

  // Polling is the always-available fallback. It stops while Realtime is live,
  // but resumes immediately if the socket drops.
  useEffect(() => {
    const tick = () => {
      if (status === "live") return;
      refresh();
    };
    const timer = window.setInterval(tick, fallbackIntervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh(true);
    };
    const onOnline = () => {
      setStatus("polling");
      setReconnectAttempt((attempt) => attempt + 1);
      refresh(true);
    };
    const onOffline = () => setStatus("offline");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [fallbackIntervalMs, refresh, status]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let realtimeClient: {
      removeAllChannels: () => Promise<unknown>;
      realtime: { isConnected: () => boolean };
    } | null = null;
    let tokenTimer: number | null = null;
    let healthTimer: number | null = null;

    const notify = (payload: RealtimeNotification) => {
      if (!payload.id || seenRef.current.has(payload.id)) return;
      seenRef.current.add(payload.id);
      if (payload.isTest) return;

      const title = payload.title?.trim() || "New admin notification";
      const description = payload.message?.trim() || "Open the admin inbox.";
      const href = safeAdminLink(payload.link);
      toast.info(title, {
        description,
        action: href
          ? {
              label: "Open",
              onClick: () => router.push(href),
            }
          : undefined,
      });

      if (readPreference(STORAGE_SOUND)) playBeep();
      if (
        readPreference(STORAGE_DESKTOP) &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        // Desktop/browser notification text is deliberately limited to the
        // order reference/category and a generic call to action. Customer
        // names, addresses, notes and payment details stay in the admin UI.
        const browserNotification = new Notification(
          browserAlertTitle(payload),
          {
            body: "Open the admin inbox for details.",
            tag: payload.id,
          },
        );
        if (href) {
          browserNotification.onclick = () => {
            window.focus();
            router.push(href);
            browserNotification.close();
          };
        }
      }
      router.refresh();
      setLastRefresh(new Date());
    };

    const connect = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        if (!cancelled) setStatus("polling");
        return;
      }

      try {
        const response = await fetch("/api/realtime/token", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setStatus("polling");
          return;
        }
        const tokenPayload = (await response.json()) as {
          enabled?: boolean;
          token?: string;
        };
        if (!tokenPayload.enabled || !tokenPayload.token) {
          if (!cancelled) setStatus("polling");
          return;
        }
        if (cancelled) return;

        const client = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { params: { eventsPerSecond: 5 } },
        });
        realtimeClient = client;
        await client.realtime.setAuth(tokenPayload.token);
        if (cancelled) {
          await client.removeAllChannels();
          return;
        }

        channel = client
          .channel("admin-notifications")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "Notification",
            },
            (payload) => notify(payload.new as RealtimeNotification),
          )
          .on(
            "broadcast",
            { event: "order.created" },
            (payload: { payload: { orderNumber?: string; customerName?: string; paymentMethod?: string } }) => {
              const data = payload.payload;
              notify({
                type: "ORDER",
                title: `New order ${data.orderNumber || ""} placed!`,
                message: `${data.customerName || "Customer"} · ${data.paymentMethod || "COD"}`,
                link: `/admin/orders`,
              });
              refresh(true);
            },
          )
          .on("broadcast", { event: "order.status_updated" }, () => {
            refresh(true);
          })
          .subscribe((subscriptionStatus) => {
            if (cancelled) return;
            if (subscriptionStatus === "SUBSCRIBED") {
              setStatus("live");
              refresh(true);
            } else if (
              subscriptionStatus === "CHANNEL_ERROR" ||
              subscriptionStatus === "TIMED_OUT" ||
              subscriptionStatus === "CLOSED"
            ) {
              setStatus("polling");
            }
          });

        const refreshToken = async () => {
          try {
            const next = await fetch("/api/realtime/token", {
              cache: "no-store",
            });
            if (!next.ok) return;
            const data = (await next.json()) as {
              enabled?: boolean;
              token?: string;
            };
            if (data.enabled && data.token) {
              await client.realtime.setAuth(data.token);
            }
          } catch {
            // The polling fallback remains active.
          }
        };
        tokenTimer = window.setInterval(refreshToken, 4 * 60 * 1000);
        healthTimer = window.setInterval(() => {
          if (cancelled) return;
          if (!navigator.onLine) {
            setStatus("offline");
            return;
          }
          // Do not keep showing "live" if the socket has silently dropped
          // between channel status callbacks. Polling remains authoritative.
          if (!client.realtime.isConnected()) {
            setStatus((current) => (current === "live" ? "polling" : current));
          }
        }, 10_000);
      } catch {
        if (!cancelled) setStatus("polling");
      }
    };

    void connect();
    return () => {
      cancelled = true;
      if (tokenTimer) window.clearInterval(tokenTimer);
      if (healthTimer) window.clearInterval(healthTimer);
      if (channel) {
        void channel.unsubscribe();
      }
      if (realtimeClient) {
        void realtimeClient.removeAllChannels();
      }
    };
  }, [reconnectAttempt, refresh, router]);

  const enableSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    writePreference(STORAGE_SOUND, enabled);
    if (enabled) playBeep();
  };

  const enableDesktop = async (enabled: boolean) => {
    if (!enabled) {
      setDesktopEnabled(false);
      writePreference(STORAGE_DESKTOP, false);
      return;
    }
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop alerts.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setDesktopEnabled(false);
      writePreference(STORAGE_DESKTOP, false);
      toast.error("Desktop alerts were not allowed. In-app alerts still work.");
      return;
    }
    setDesktopEnabled(true);
    writePreference(STORAGE_DESKTOP, true);
    toast.success("Desktop alerts enabled.");
  };

  const statusTone =
    status === "live"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-red-500"
        : status === "polling"
          ? "bg-amber-500"
          : "bg-slate-400";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${statusCopy(status)}${unreadCount ? `, ${unreadCount} unread` : ""}. Notification settings`}
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-0.5 top-0.5 grid size-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span
            className={cn(
              "absolute bottom-1.5 right-1.5 size-2 rounded-full ring-2 ring-background",
              statusTone,
              status === "connecting" && "animate-pulse",
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notification centre</DropdownMenuLabel>
        <div
          className="px-2.5 pb-2 text-xs text-muted-foreground"
          role="status"
        >
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            {status === "offline" ? (
              <WifiOff className="size-3.5" />
            ) : (
              <Wifi className="size-3.5" />
            )}
            {statusCopy(status)}
          </span>
          <span className="mt-1 block">
            {lastRefresh
              ? `Last checked ${lastRefresh.toLocaleTimeString("en-NP", {
                  timeZone: "Asia/Kathmandu",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Waiting for the first check."}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            startManualRefresh(() => {
              setStatus("connecting");
              setReconnectAttempt((attempt) => attempt + 1);
              refresh(true);
            })
          }
          disabled={manualPending}
        >
          {manualPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Refresh and retry
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={soundEnabled}
          onCheckedChange={enableSound}
        >
          {soundEnabled ? <Volume2 /> : <VolumeX />}
          Sound for new orders
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={desktopEnabled}
          onCheckedChange={(checked) => void enableDesktop(checked === true)}
        >
          {desktopEnabled ? <BellRing /> : <Bell />}
          Enable desktop alerts
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/admin/notifications">
            <Check />
            Open notification inbox
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
