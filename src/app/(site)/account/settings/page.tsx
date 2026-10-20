import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/account/settings-form";
import { requireUser } from "@/lib/security";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div>
      <div>
        <p className="eyebrow">Your details</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Account settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your contact details current so orders and bookings reach you.
        </p>
      </div>

      <div className="mt-6">
        <SettingsForm
          user={{
            name: user.name,
            email: user.email,
            phone: user.phone,
            image: user.image,
            emailVerified: user.emailVerified,
          }}
          uploadEnabled={Boolean(process.env.UPLOADTHING_TOKEN)}
        />
      </div>

      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        Need to change your email address, close your account or request a copy
        of your data?{" "}
        <Link href="/contact" className="font-medium text-primary underline">
          Contact the restaurant
        </Link>{" "}
        and we will help. See our{" "}
        <Link href="/privacy" className="font-medium text-primary underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
