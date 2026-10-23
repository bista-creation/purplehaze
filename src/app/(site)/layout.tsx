import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartSheet } from "@/components/cart/cart-sheet";
import { PurpleHazeAssistant } from "@/components/voice/purple-haze-assistant";
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
        <PurpleHazeAssistant />
        <RestaurantJsonLd />
      </div>
    </SessionProvider>
  );
}
