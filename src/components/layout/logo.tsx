import Image from "next/image";
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
      <div
        className={cn(
          "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border bg-white shadow-xs transition-transform group-hover:scale-105 sm:size-11",
          light ? "border-gold/50 shadow-[0_0_15px_rgba(216,173,104,0.3)]" : "border-primary/20"
        )}
      >
        <Image
          src="/images/brand/purplehaze-logo.png"
          alt="Purple Haze Restro & Garden Logo"
          width={44}
          height={44}
          className="size-full object-contain p-0.5"
          priority
        />
      </div>
      {showText ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-script text-2xl font-bold tracking-normal leading-none sm:text-[28px]",
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
