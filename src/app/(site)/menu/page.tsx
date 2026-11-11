import type { Metadata } from "next";
import Link from "next/link";
import { Bike, Clock, Info, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { Badge } from "@/components/ui/badge";
import { menuService } from "@/lib/services/menu.service";
import { getPublicSettings } from "@/lib/settings";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the Purple Haze menu: Authentic Nepali thakali sets and momos, Continental & Italian pizzas and pastas, sizzling Pan Asian plates, and rich Indian curries. Order for delivery, pickup or dine-in in Biratnagar.",
  alternates: { canonical: "/menu" },
  openGraph: {
    title: "Menu | Purple Haze Restro & Garden",
    description:
      "Authentic Nepali, Continental & Italian, Pan Asian and Indian food in Biratnagar. Order online.",
    images: ["/images/menu/indian.jpg"],
  },
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [categories, settings, params] = await Promise.all([
    menuService.getMenuCategories(),
    getPublicSettings(),
    searchParams,
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Purple Haze Restro & Garden Menu",
    hasMenuSection: categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      hasMenuItem: category.dishes.map((dish) => ({
        "@type": "MenuItem",
        name: dish.name,
        description: dish.description,
        offers: {
          "@type": "Offer",
          price: (dish.price / 100).toFixed(2),
          priceCurrency: "NPR",
        },
        suitableForDiet: dish.isVeg
          ? "https://schema.org/VegetarianDiet"
          : undefined,
      })),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      {/* MOBILE-RESPONSIVE COMPACT HERO BANNER */}
      <section className="relative overflow-hidden border-b border-border/60 bg-ink py-8 sm:py-12 lg:py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(124,58,237,0.4),transparent_55%)]" />
        <div className="absolute inset-0 paper-texture opacity-20" />
        <div className="container-page relative">
          <div className="max-w-3xl">
            <Badge variant="gold" className="rounded-full text-xs">
              <UtensilsCrossed className="size-3 mr-1" /> Kitchen open daily
            </Badge>
            <h1 className="mt-3 text-3xl font-display font-semibold tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              The menu.
            </h1>
            <p className="mt-2.5 max-w-2xl text-xs sm:text-sm lg:text-base leading-relaxed text-white/70 sm:mt-4">
              Authentic Nepali comfort food, Continental &amp; Italian stone-baked pizzas, sizzling
              Pan Asian wok plates, and rich Indian curries. Freshly prepared for delivery, pickup, or dine-in.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] sm:text-xs text-white/60 sm:mt-6">
              <span className="inline-flex items-center gap-1.5">
                <Bike className="size-3.5 text-gold" /> Delivery in Biratnagar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-gold" /> Quick Pickup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Store className="size-3.5 text-gold" /> Garden Dine-in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-gold" /> 9 AM – 10 PM
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-5 sm:py-8 lg:py-10">
        {/* COMPACT ORDERING STATUS BANNER */}
        <div className="mb-5 sm:mb-8 flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {settings.acceptingOrders
                  ? "Online ordering is open"
                  : "Ordering is temporarily paused"}
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs leading-normal text-muted-foreground">
                {settings.acceptingOrders
                  ? "Choose delivery, pickup or dine-in at checkout. Menu prices in NPR; taxes shown before payment."
                  : "You can browse the menu, but online ordering is paused. Please call us to order."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span
              className={`size-2 rounded-full ${
                settings.acceptingOrders ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
              {settings.acceptingOrders ? "Accepting orders" : "Paused"}
            </span>
          </div>
        </div>

        {/* MENU BROWSER WITH MOBILE SMALL DISH IMAGES & PRACTICAL CARDS */}
        <MenuBrowser categories={categories} initialCategory={params.category} />

        <div className="mt-12 sm:mt-16 rounded-2xl border border-dashed border-border bg-card/50 p-5 sm:p-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>
            Allergies or a special request? Add a note to your dish or{" "}
            <Link href="/contact" className="font-semibold text-primary underline-offset-4 hover:underline">
              contact our team
            </Link>
            . Menu items and availability can change with the season.
          </p>
        </div>
      </section>
    </>
  );
}
