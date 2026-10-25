"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/use-mounted";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const ASSISTANT_URL = "https://mani-ai-psi.vercel.app/embed/purple-haze";
const ASSISTANT_ORIGIN = new URL(ASSISTANT_URL).origin;
const AVATAR_URL = "/images/brand/maya.png";

type AssistantCloseMessage = {
  type: "mani-ai:close";
  action?: "close";
};

function isCloseMessage(data: unknown): data is AssistantCloseMessage {
  if (typeof data !== "object" || data === null) return false;

  const message = data as { type?: unknown; action?: unknown };
  return (
    message.type === "mani-ai:close" &&
    (message.action === undefined || message.action === "close")
  );
}

/**
 * Purple Haze's own Maya assistant.
 *
 * Scaled cleanly for mobile screens with website brand theme matching
 * (royal violet & gold palette in light and dark modes).
 *
 * z-index is set to z-40 so all modals, mobile nav sheets, and the cart slider
 * (z-50) cleanly layer over the assistant without covering checkout actions.
 */
export function PurpleHazeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);

  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isCartOpen = useCartStore((state) => state.isOpen);

  const syncThemeToIframe = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
    try {
      iframeRef.current.contentWindow.postMessage(
        { type: "theme", theme: currentTheme },
        ASSISTANT_ORIGIN,
      );
      iframeRef.current.contentWindow.postMessage(
        { type: "set-theme", theme: currentTheme },
        ASSISTANT_ORIGIN,
      );
    } catch {
      // Ignore cross-origin error
    }
  }, [resolvedTheme]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      if (event.origin !== ASSISTANT_ORIGIN) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isCloseMessage(event.data)) return;

      setIsOpen(false);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      syncThemeToIframe();
      return;
    }

    if (hasOpenedRef.current) {
      launcherRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, syncThemeToIframe]);

  const activeTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const assistantSrc = `${ASSISTANT_URL}?theme=${activeTheme}`;

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        type="button"
        aria-label="Open Maya assistant (online)"
        aria-haspopup="dialog"
        title="Chat with Maya"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-40 cursor-pointer overflow-visible rounded-full p-0 select-none",
          "bottom-3 right-3 sm:bottom-5 sm:right-5",
          "h-[50px] w-[50px] sm:h-[58px] sm:w-[58px]",
          "border-2 border-gold bg-[#1a1025]",
          "shadow-[0_8px_25px_rgba(91,33,182,0.35)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.7)]",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1025]",
          isCartOpen && "pointer-events-none opacity-0 scale-75",
        )}
      >
        <Image
          src={AVATAR_URL}
          alt="Maya assistant"
          width={58}
          height={58}
          className="h-full w-full rounded-full object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#1a1025] bg-[#22C55E] sm:h-3 sm:w-3"
        />
      </button>
    );
  }

  return (
    <div
      id="maya-assistant"
      role="dialog"
      aria-label="Maya assistant"
      className={cn(
        "fixed z-40 overflow-hidden transition-all duration-300 ease-out",
        // Mobile layout: scaled smaller and compact (max 330px wide, max 470px tall)
        "bottom-3 right-3 w-[calc(100vw-24px)] max-w-[330px] h-[470px] max-h-[calc(100dvh-72px)]",
        // Tablet & Desktop layout: standard full chat window (380px wide, 580px tall)
        "sm:bottom-5 sm:right-5 sm:w-[380px] sm:max-w-[400px] sm:h-[580px] sm:max-h-[calc(100dvh-90px)]",
        // Website theme matching:
        // Royal violet & gold aesthetic matching Purple Haze Restro & Garden
        "rounded-2xl border-2 border-gold/70 bg-card dark:bg-[#1E132C]",
        "shadow-[0_12px_45px_-8px_rgba(91,33,182,0.35)] dark:shadow-[0_18px_55px_-8px_rgba(0,0,0,0.85)]",
        "ring-1 ring-gold/30",
        isCartOpen && "pointer-events-none opacity-0",
      )}
    >
      <iframe
        ref={iframeRef}
        src={assistantSrc}
        title="Purple Haze Assistant"
        allow="microphone"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={syncThemeToIframe}
        className="h-full w-full border-none bg-transparent"
      />
    </div>
  );
}
