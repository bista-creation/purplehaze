"use client";

import { useEffect } from "react";

const PX_TO_MM = 25.4 / 96;
const PAGE_WIDTH_MM = 80;
const PAGE_MARGIN_MM = 3;

/**
 * Chrome does not support `@page { size: 80mm auto }`. Measure the rendered
 * thermal sheet and replace the fallback page rule with a page that is exactly
 * as tall as the content. This keeps short receipts from wasting a full A4-
 * height sheet while still allowing long tickets to grow. The server renders
 * `@page { size: 80mm 297mm }` as a no-JS fallback.
 */
export function ThermalPageSize({ targetId }: { targetId: string }) {
  useEffect(() => {
    let cancelled = false;

    const apply = () => {
      const element = document.getElementById(targetId);
      if (!element) return;

      const style = window.getComputedStyle(element);
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      const contentHeight =
        element.getBoundingClientRect().height - paddingTop - paddingBottom;
      const contentMm = contentHeight * PX_TO_MM * 1.06;
      const pageHeight = Math.min(
        1000,
        Math.max(40, Math.ceil(contentMm + PAGE_MARGIN_MM * 2 + 2)),
      );

      let pageStyle = document.getElementById(
        "thermal-page-style",
      ) as HTMLStyleElement | null;
      if (!pageStyle) {
        pageStyle = document.createElement("style");
        pageStyle.id = "thermal-page-style";
        document.body.appendChild(pageStyle);
      }
      pageStyle.textContent = `@page { size: ${PAGE_WIDTH_MM}mm ${pageHeight}mm; margin: ${PAGE_MARGIN_MM}mm; }`;
      pageStyle.dataset.pageHeight = String(pageHeight);
    };

    void document.fonts.ready.then(() => {
      if (cancelled) return;
      window.requestAnimationFrame(apply);
    });

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  return null;
}
