"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StatusPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 25_000);
    return () => window.clearInterval(interval);
  }, [active, router]);

  return null;
}
