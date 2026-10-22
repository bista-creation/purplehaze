"use client";

import { createElement, useEffect, useState } from "react";
import Script from "next/script";

const AGENT_ID = "agent_6101m5jccc9rf57ag003pnd8a3hx";
const AVATAR_URL = "https://purplehaze-nine.vercel.app/images/brand/maya.png";
const MOBILE_QUERY = "(max-width: 767px)";
const CLOSE_BUTTON_ATTRIBUTE = "data-maya-close";
const CLOSE_BUTTON_STYLE_ID = "maya-close-style";
const CLOSE_BUTTON_CSS = `
  button[${CLOSE_BUTTON_ATTRIBUTE}] {
    position: absolute;
    top: 16px;
    right: 52px;
    z-index: 30;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: 1px solid var(--el-base-border, #e5dcf6);
    border-radius: 9999px;
    background: var(--el-base, #faf8ff);
    color: var(--el-base-primary, #1a1025);
    box-shadow: 0 1px 2px rgb(26 16 37 / 0.08);
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  button[${CLOSE_BUTTON_ATTRIBUTE}]:hover {
    background: var(--el-base-hover, #f3effc);
    border-color: var(--el-base-border, #e5dcf6);
  }
  button[${CLOSE_BUTTON_ATTRIBUTE}]:focus-visible {
    outline: 2px solid var(--el-accent, #5b21b6);
    outline-offset: 2px;
  }
  button[${CLOSE_BUTTON_ATTRIBUTE}] svg {
    display: block;
    width: 16px;
    height: 16px;
  }
`;

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

  useEffect(() => {
    const host = document.querySelector<HTMLElement>("elevenlabs-convai");
    if (!host) return;

    let active = true;
    let observer: MutationObserver | null = null;
    let retry: number | null = null;
    let retryTimeout: number | null = null;

    const ensureCloseButton = () => {
      const root = host.shadowRoot;
      if (!root) return;

      if (!root.querySelector(`style[data-${CLOSE_BUTTON_STYLE_ID}]`)) {
        const style = document.createElement("style");
        style.setAttribute(`data-${CLOSE_BUTTON_STYLE_ID}`, "true");
        style.textContent = CLOSE_BUTTON_CSS;
        root.appendChild(style);
      }

      const panel = root.querySelector<HTMLElement>('.sheet[data-shown="true"]');
      if (!panel || panel.querySelector(`[${CLOSE_BUTTON_ATTRIBUTE}]`)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(CLOSE_BUTTON_ATTRIBUTE, "true");
      button.setAttribute("aria-label", "Close Maya chat");
      button.title = "Close chat";
      button.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      `;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentRoot = host.shadowRoot;
        const launcher = currentRoot?.querySelector<HTMLElement>(".rounded-compact-sheet");
        if (launcher) {
          launcher.click();
          return;
        }
        currentRoot?.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')?.click();
      });

      panel.appendChild(button);
    };

    const connect = () => {
      if (!active) return;
      const root = host.shadowRoot;
      if (!root) return;

      if (retry !== null) {
        window.clearInterval(retry);
        retry = null;
      }
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (!observer) {
        observer = new MutationObserver(ensureCloseButton);
        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-shown"],
        });
      }
      ensureCloseButton();
    };

    const start = () => {
      if (!active) return;
      connect();
      if (!host.shadowRoot) {
        retry = window.setInterval(connect, 250);
        retryTimeout = window.setTimeout(() => {
          if (retry !== null) {
            window.clearInterval(retry);
            retry = null;
          }
        }, 15000);
      }
    };

    if (customElements.get("elevenlabs-convai")) {
      start();
    } else {
      void customElements.whenDefined("elevenlabs-convai").then(start);
    }

    return () => {
      active = false;
      observer?.disconnect();
      if (retry !== null) window.clearInterval(retry);
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
    };
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
