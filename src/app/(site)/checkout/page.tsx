import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/security";
import { getActiveDeliveryZones } from "@/lib/queries";
import { getPublicSettings } from "@/lib/settings";
import { onlinePaymentAvailability } from "@/lib/payments";
import { getLoyaltySummary } from "@/lib/services/loyalty.service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [user, zones, settings] = await Promise.all([
    getCurrentUser(),
    getActiveDeliveryZones(),
    getPublicSettings(),
  ]);

  const [defaultAddress, loyaltySummary] = await Promise.all([
    user
      ? prisma.address.findFirst({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        })
      : null,
    user ? getLoyaltySummary(user.id).catch(() => null) : null,
  ]);
  const availability = onlinePaymentAvailability();
  const esewaEnabled = settings.esewaEnabled && availability.esewa;
  const khaltiEnabled = settings.khaltiEnabled && availability.khalti;

  return (
    <section className="container-page py-10 lg:py-14">
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Back to cart
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            Let’s get this to you.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Delivery, pickup or dine-in. Guest checkout is welcome.
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secure, encrypted checkout
        </p>
      </div>

      {!settings.acceptingOrders ? (
        <Alert variant="warning" className="mt-6">
          <AlertDescription>
            Online ordering is paused right now. You can still browse the menu,
            or call us on{" "}
            <a href="tel:+9779851150987" className="font-semibold underline">
              +977 9851150987
            </a>{" "}
            to place an order.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-8">
        <CheckoutForm
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            fee: zone.fee,
            minOrder: zone.minOrder,
          }))}
          taxRate={settings.taxRate}
          serviceChargeRate={settings.serviceChargeRate}
          minDeliveryOrder={settings.minDeliveryOrder}
          codEnabled={settings.codEnabled}
          esewaEnabled={esewaEnabled}
          khaltiEnabled={khaltiEnabled}
          user={
            user
              ? {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  defaultAddress: defaultAddress
                    ? {
                        line1: defaultAddress.line1,
                        line2: defaultAddress.line2,
                        city: defaultAddress.city,
                        state: defaultAddress.state,
                      }
                    : null,
                }
              : null
          }
          loyaltySummary={loyaltySummary}
          paymentMode={availability.mode}
        />
      </div>
    </section>
  );
}
