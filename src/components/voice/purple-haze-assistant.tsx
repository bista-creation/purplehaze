import type { CSSProperties } from "react";

const ASSISTANT_URL = "https://mani-ai-psi.vercel.app/embed/purple-haze";

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

/**
 * Purple Haze's own Maya assistant, embedded as an isolated cross-origin
 * iframe. The assistant owns its UI and data handling; this site only grants
 * the frame microphone access. See next.config.ts for the matching
 * Permissions-Policy allowlist entry.
 */
export function PurpleHazeAssistant() {
  return (
    <div style={panelStyle}>
      <iframe
        src={ASSISTANT_URL}
        title="Purple Haze Assistant"
        allow="microphone"
        referrerPolicy="strict-origin-when-cross-origin"
        style={iframeStyle}
      />
    </div>
  );
}
