import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartSheet } from "@/components/cart/cart-sheet";
import { ElevenLabsWidget } from "@/components/voice/elevenlabs-widget";
import { RestaurantJsonLd } from "@/components/seo/restaurant-json-ld";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CartSheet />
        <ElevenLabsWidget />
        <RestaurantJsonLd />
      </div>
    </SessionProvider>
  );
}
