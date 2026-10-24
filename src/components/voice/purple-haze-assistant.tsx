"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const ASSISTANT_URL = "https://mani-ai-psi.vercel.app/embed/purple-haze";
const ASSISTANT_ORIGIN = new URL(ASSISTANT_URL).origin;
const AVATAR_URL = "/images/brand/maya.png";

const panelStyle: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  zIndex: 999999,
  width: 380,
  height: 600,
  maxWidth: "calc(100vw - 30px)",
  maxHeight: "calc(100vh - 40px)",
};

const iframeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  borderRadius: 16,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
};

const launcherStyle: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  zIndex: 999999,
  width: 60,
  height: 60,
  padding: 0,
  border: "2px solid #f5b942",
  borderRadius: "9999px",
  background: "#1a1025",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
  cursor: "pointer",
  overflow: "visible",
  WebkitTapHighlightColor: "transparent",
};

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
 * The assistant is isolated in a cross-origin iframe and owns its
 * conversation UI. Its close button sends a `mani-ai:close` message to this
 * page; we hide the frame and show the launcher again. The message is only
 * accepted from the assistant's exact origin and iframe window.
 */
export function PurpleHazeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);

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
      return;
    }

    if (hasOpenedRef.current) {
      launcherRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        type="button"
        aria-label="Open Maya assistant (online)"
        aria-haspopup="dialog"
        title="Chat with Maya"
        style={launcherStyle}
        onClick={() => setIsOpen(true)}
        className="rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1025]"
      >
        <Image
          src={AVATAR_URL}
          alt=""
          width={60}
          height={60}
          className="h-full w-full rounded-full object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#1a1025] bg-[#22C55E]"
        />
      </button>
    );
  }

  return (
    <div
      id="maya-assistant"
      style={panelStyle}
      role="dialog"
      aria-label="Maya assistant"
    >
      <iframe
        ref={iframeRef}
        src={ASSISTANT_URL}
        title="Purple Haze Assistant"
        allow="microphone"
        referrerPolicy="strict-origin-when-cross-origin"
        style={iframeStyle}
      />
    </div>
  );
}
