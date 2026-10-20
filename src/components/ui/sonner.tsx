"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark" | undefined) ?? "system"}
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "rounded-xl border-border shadow-xl",
        },
      }}
    />
  );
}
