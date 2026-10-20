import Link from "next/link";
import { ArrowLeft, Quote } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmartImage } from "@/components/ui/smart-image";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <SmartImage
          src="/images/hero/restaurant.jpg"
          alt="The warm dining room at Purple Haze"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo variant="light" />
          <div className="max-w-md">
            <Quote className="mb-4 size-8 text-gold" aria-hidden />
            <blockquote className="font-display text-3xl leading-snug text-white xl:text-4xl">
              “Good food is the foundation of genuine happiness.”
            </blockquote>
            <p className="mt-5 text-xs uppercase tracking-[0.22em] text-gold">
              The Purple Haze table
            </p>
            <p className="mt-8 text-sm leading-7 text-white/55">
              Nepali comfort food, Indian classics, Asian favourites and
              continental plates — in a leafy garden on Airport Road.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-white/35">
            <span>Biratnagar, Nepal</span>
            <span>Est. in the garden</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex h-20 items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Back to restaurant
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-14 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="px-5 pb-6 text-center text-xs text-muted-foreground sm:px-8">
          Purple Haze Restro &amp; Garden · Airport Road, Biratnagar
        </div>
      </div>
    </div>
  );
}
