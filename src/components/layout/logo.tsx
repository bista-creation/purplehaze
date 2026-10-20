import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "default",
  showText = true,
}: {
  className?: string;
  variant?: "default" | "light";
  showText?: boolean;
}) {
  const light = variant === "light";
  return (
    <Link
      href="/"
      aria-label="Purple Haze Restro & Garden — home"
      className={cn("group inline-flex items-center gap-2.5 sm:gap-3", className)}
    >
      <span
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-full border text-[10px] font-bold tracking-[0.12em] transition-transform group-hover:rotate-6 sm:size-11 sm:text-[11px]",
          light
            ? "border-gold/50 bg-white/10 text-gold"
            : "border-primary/20 bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_rgba(91,33,182,0.7)]",
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 48 48"
          className="absolute inset-1 opacity-30"
          fill="none"
        >
          <path
            d="M24 3c3 8 9 14 21 21-12 7-18 13-21 21-3-8-9-14-21-21C15 17 21 11 24 3Z"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
        <span className="relative">PH</span>
      </span>
      {showText ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-lg font-semibold tracking-tight sm:text-xl",
              light ? "text-white" : "text-foreground",
            )}
          >
            Purple Haze
          </span>
          <span
            className={cn(
              "mt-1 text-[9px] font-semibold uppercase tracking-[0.24em]",
              light ? "text-gold/90" : "text-primary/75",
            )}
          >
            Restro &amp; Garden
          </span>
        </span>
      ) : null}
    </Link>
  );
}
