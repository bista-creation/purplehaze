import type { Metadata } from "next";
import Link from "next/link";
import { Bike, Clock, Info, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { Badge } from "@/components/ui/badge";
import { getMenuCategories } from "@/lib/queries";
import { getPublicSettings } from "@/lib/settings";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the Purple Haze menu: Nepali momos and comfort food, Indian curries, Asian favourites and continental plates. Order for delivery, pickup or dine-in in Biratnagar.",
  alternates: { canonical: "/menu" },
  openGraph: {
    title: "Menu | Purple Haze Restro & Garden",
    description:
      "Nepali, Indian, Asian and continental food in Biratnagar. Order online.",
    images: ["/images/menu/indian.jpg"],
  },
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [categories, settings, params] = await Promise.all([
    getMenuCategories(),
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
      <section className="relative overflow-hidden border-b border-border/60 bg-ink py-16 text-white lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(124,58,237,0.4),transparent_55%)]" />
        <div className="absolute inset-0 paper-texture opacity-20" />
        <div className="container-page relative">
          <div className="max-w-3xl">
            <Badge variant="gold" className="rounded-full">
              <UtensilsCrossed className="size-3" /> Kitchen open daily
            </Badge>
            <h1 className="display-title mt-5 text-white">The menu.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">
              Familiar Nepali comfort food, slow-simmered Indian curries, wok
              favourites and continental plates. Choose an option, add a little
              extra, and we will take it from there.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-2">
                <Bike className="size-4 text-gold" /> Delivery in selected areas
              </span>
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="size-4 text-gold" /> Pickup
              </span>
              <span className="inline-flex items-center gap-2">
                <Store className="size-4 text-gold" /> Dine-in
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-gold" /> 9 AM – 10 PM
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                {settings.acceptingOrders
                  ? "Ordering is open"
                  : "Ordering is temporarily paused"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {settings.acceptingOrders
                  ? "Choose delivery, pickup or dine-in at checkout. Menu prices are in NPR; taxes are shown before you pay."
                  : "You can browse the menu, but online ordering is paused. Please call us to order."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                settings.acceptingOrders ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {settings.acceptingOrders ? "Accepting orders" : "Paused"}
            </span>
          </div>
        </div>

        <MenuBrowser categories={categories} initialCategory={params.category} />

        <div className="mt-16 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
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
