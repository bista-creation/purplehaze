import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const settings = await getPublicSettings();
  return (
    <section className="container-page py-12 lg:py-16">
      <div className="mb-8">
        <p className="eyebrow">Almost there</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
          Your cart.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check everything once. You can still add a note at checkout.
        </p>
      </div>
      <CartView
        taxRate={settings.taxRate}
        serviceChargeRate={settings.serviceChargeRate}
        minDeliveryOrder={settings.minDeliveryOrder}
      />
    </section>
  );
}
