"use client";

import { useEffect } from "react";

/**
 * Opens the print dialog once the receipt is painted. Used by the dedicated
 * print routes and by the KOT route. The browser (or the operator) still
 * chooses the printer, paper size and copies.
 */
export function AutoPrint({ delay = 550 }: { delay?: number }) {
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void document.fonts.ready.then(() => {
        if (!cancelled) window.print();
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [delay]);

  return null;
}
