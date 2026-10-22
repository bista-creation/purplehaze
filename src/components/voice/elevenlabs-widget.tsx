"use client";

import { createElement, useEffect, useState } from "react";
import Script from "next/script";

const AGENT_ID = "agent_6301m5j07ysaft8bygkjb77bjwmr";
const AVATAR_URL = "https://purplehaze-nine.vercel.app/images/brand/maya.png";
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Loads the public ElevenLabs conversation widget once for the public site.
 *
 * The custom element is intentionally created without JSX so the widget can
 * be server-rendered without an ambient `elevenlabs-convai` JSX declaration.
 * No API key or signed URL is exposed here: this agent is public and uses the
 * domain allowlist configured in ElevenLabs.
 */
export function ElevenLabsWidget() {
  const [variant, setVariant] = useState<"compact" | "tiny">("compact");

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const syncVariant = () => setVariant(mobile.matches ? "tiny" : "compact");

    syncVariant();
    mobile.addEventListener("change", syncVariant);
    return () => mobile.removeEventListener("change", syncVariant);
  }, []);

  return (
    <>
      <Script
        id="elevenlabs-convai-embed"
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
      />
      {createElement("elevenlabs-convai", {
        "agent-id": AGENT_ID,
        "avatar-image-url": AVATAR_URL,
        "avatar-orb-color-1": "#5b21b6",
        "avatar-orb-color-2": "#f5b942",
        "show-avatar-when-collapsed": "true",
        variant,
        placement: "bottom-right",
        dismissible: "true",
        "text-input": "true",
        "action-text": "Talk to Maya",
        "start-call-text": "Talk to Maya",
        "end-call-text": "End conversation",
        "expand-text": "Chat with Maya",
        "collapse-text": "Minimise chat",
        "listening-text": "Listening…",
        "speaking-text": "Maya is speaking…",
        "markdown-link-allowed-hosts": "purplehaze-nine.vercel.app,wa.me",
      })}
    </>
  );
}
