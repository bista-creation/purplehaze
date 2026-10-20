import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  FileText,
  MapPin,
  Settings2,
  Store,
  Truck,
} from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page";
import { DeliveryZoneAdmin } from "@/components/admin/delivery-zone-admin";
import { SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/security";
import {
  getEsewaConfig,
  getKhaltiConfig,
  getPaymentMode,
  isKhaltiDemoKey,
  isTestPaymentModeAllowed,
} from "@/lib/payments";
import { paisaToRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "general", label: "Restaurant", icon: Store },
  { value: "ordering", label: "Ordering", icon: Settings2 },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "delivery", label: "Delivery zones", icon: Truck },
  { value: "content", label: "Hero & SEO", icon: FileText },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin("/admin/settings");
  const params = await searchParams;
  const tab = (
    TABS.some((item) => item.value === params.tab) ? params.tab : "general"
  ) as Tab;
  const settings = await getSettings();
  const paymentMode = getPaymentMode();
  const testPaymentsAllowed = isTestPaymentModeAllowed();
  const esewaConfig = getEsewaConfig();
  const khaltiConfig = getKhaltiConfig();
  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const environment = [
    {
      label: "Database",
      ok: Boolean(process.env.DATABASE_URL),
      detail: process.env.DATABASE_URL?.startsWith("file:")
        ? "Local SQLite — switch to PostgreSQL before launch"
        : "PostgreSQL connection string configured",
    },
    {
      label: "Payment mode",
      ok:
        paymentMode === "live" ||
        (testPaymentsAllowed && paymentMode === "sandbox"),
      detail:
        paymentMode === "live"
          ? "Live gateways — real money moves"
          : !testPaymentsAllowed
            ? "Test payment modes are disabled in this production runtime — configure live gateways"
            : paymentMode === "sandbox"
              ? "Sandbox gateways — test money only"
              : "Demo payments — no real money moves",
    },
    {
      label: "eSewa keys",
      ok: Boolean(esewaConfig),
      detail: esewaConfig
        ? `Merchant ${esewaConfig.merchantCode} · ${esewaConfig.mode}`
        : "Merchant code and signature secret are required",
    },
    {
      label: "Khalti key",
      ok: Boolean(khaltiConfig),
      detail: khaltiConfig
        ? isKhaltiDemoKey()
          ? "Using Khalti's public sandbox demo key — replace it with your own from test-admin.khalti.com"
          : `Secret configured · ${khaltiConfig.mode} · ${khaltiConfig.baseUrl}`
        : "Add the sandbox secret key from test-admin.khalti.com",
    },
    {
      label: "Email (Resend)",
      ok: Boolean(process.env.RESEND_API_KEY),
      detail: "Without a key, emails are printed to the server console",
    },
    {
      label: "UploadThing",
      ok: Boolean(process.env.UPLOADTHING_TOKEN),
      detail: "Image uploads; manual /images paths work without it",
    },
    {
      label: "Upstash rate limit",
      ok: Boolean(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN,
      ),
      detail: "Falls back to in-memory rate limiting",
    },
    {
      label: "Google sign-in",
      ok: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
      detail: "Optional social login",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Administration"
        title="Settings"
        description="Business details, ordering rules, delivery pricing and payment availability. Secrets and provider credentials stay in environment variables and are never editable from this screen."
        actions={
          <Badge variant="violet" className="gap-1.5">
            <ShopIcon /> Admin only
          </Badge>
        }
      />

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "general"
                ? "/admin/settings"
                : `/admin/settings?tab=${item.value}`
            }
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              tab === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "general" ? (
        <AdminCard className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold">
              Restaurant details
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              These details appear in the header, footer, contact page, receipts
              and structured data. Use the verified public email and phone
              numbers only.
            </p>
          </div>
          <SettingsForm
            group="general"
            fields={[
              {
                key: "restaurant.name",
                label: "Restaurant name",
                value: settings["restaurant.name"] ?? "",
                required: true,
              },
              {
                key: "restaurant.tagline",
                label: "Tagline",
                value: settings["restaurant.tagline"] ?? "",
                fullWidth: true,
              },
              {
                key: "restaurant.email",
                label: "Public email",
                value: settings["restaurant.email"] ?? "",
                type: "email",
                required: true,
                hint: "The admin testing inbox is never shown publicly.",
              },
              {
                key: "restaurant.phone",
                label: "Mobile phone",
                value: settings["restaurant.phone"] ?? "",
                required: true,
              },
              {
                key: "restaurant.landline",
                label: "Landline",
                value: settings["restaurant.landline"] ?? "",
              },
              {
                key: "restaurant.facebook",
                label: "Facebook URL",
                value: settings["restaurant.facebook"] ?? "",
                type: "url",
              },
              {
                key: "restaurant.address",
                label: "Address",
                value: settings["restaurant.address"] ?? "",
                required: true,
                fullWidth: true,
              },
              {
                key: "restaurant.hours",
                label: "Opening hours",
                value: settings["restaurant.hours"] ?? "",
                required: true,
                fullWidth: true,
                hint: "Confirm current hours with the owner before launch.",
              },
            ]}
          />
        </AdminCard>
      ) : null}

      {tab === "ordering" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <AdminCard className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-display text-2xl font-semibold">
                Order rules
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tax and service charge are applied to the food subtotal at
                checkout. Values are percentages. Order scheduling is controlled
                here too.
              </p>
            </div>
            <SettingsForm
              group="ordering"
              fields={[
                {
                  key: "order.acceptingOrders",
                  label: "Accept online orders",
                  value: settings["order.acceptingOrders"] ?? "true",
                  type: "toggle",
                  hint: "Turn this off to pause the website ordering flow without taking the site down.",
                },
                {
                  key: "order.taxRate",
                  label: "Tax rate (%)",
                  value: settings["order.taxRate"] ?? "13",
                  type: "number",
                  min: 0,
                  max: 100,
                  step: 0.01,
                  required: true,
                  hint: "Nepal VAT is commonly 13%. Confirm the restaurant's registration.",
                },
                {
                  key: "order.serviceChargeRate",
                  label: "Service charge (%)",
                  value: settings["order.serviceChargeRate"] ?? "0",
                  type: "number",
                  min: 0,
                  max: 100,
                  step: 0.01,
                },
                {
                  key: "order.minDeliveryOrder",
                  label: "Minimum delivery order (NPR)",
                  value: String(
                    paisaToRupees(
                      Number(settings["order.minDeliveryOrder"] ?? 0),
                    ),
                  ),
                  type: "number",
                  min: 0,
                  step: 0.01,
                  hint: "Applied on top of each delivery zone's minimum.",
                },
                {
                  key: "order.prepTimeMinutes",
                  label: "Average prep time (minutes)",
                  value: settings["order.prepTimeMinutes"] ?? "25",
                  type: "number",
                  min: 1,
                  max: 180,
                  required: true,
                },
                {
                  key: "order.cancellationWindowMinutes",
                  label: "Customer cancellation window (minutes)",
                  value: settings["order.cancellationWindowMinutes"] ?? "10",
                  type: "number",
                  min: 0,
                  max: 10080,
                  required: true,
                  hint: "After this window, only staff can cancel.",
                },
              ]}
            />
          </AdminCard>

          <div className="space-y-4">
            <AdminCard className="p-5">
              <h3 className="font-display text-lg font-semibold">
                Tax & service
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Order totals are stored in integer paisa. Changing rates only
                affects new orders; existing order snapshots do not change.
              </p>
            </AdminCard>
            <AdminCard className="p-5">
              <h3 className="font-display text-lg font-semibold">
                Scheduled orders
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Delivery and pickup orders can be scheduled for a later
                Nepal-time slot. Prep time determines the earliest available
                slot.
              </p>
            </AdminCard>
            <AdminCard className="p-5">
              <h3 className="font-display text-lg font-semibold">Currency</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Prices are displayed in NPR (Rs). Timezone: Asia/Kathmandu
                (UTC+05:45). Storage is UTC.
              </p>
            </AdminCard>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <AdminCard className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-display text-2xl font-semibold">
                Customer payment options
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                These toggles only remove an option from the checkout. Provider
                credentials and live/mock mode are configured in environment
                variables. Online payment success is verified before an order is
                marked paid.
              </p>
            </div>
            <SettingsForm
              group="payments"
              fields={[
                {
                  key: "payment.codEnabled",
                  label: "Cash on delivery",
                  value: settings["payment.codEnabled"] ?? "true",
                  type: "toggle",
                  hint: "Cash is collected at delivery, pickup or the table.",
                },
                {
                  key: "payment.esewaEnabled",
                  label: "eSewa",
                  value: settings["payment.esewaEnabled"] ?? "true",
                  type: "toggle",
                  hint: "Uses the configured eSewa merchant account and signed callback verification.",
                },
                {
                  key: "payment.khaltiEnabled",
                  label: "Khalti",
                  value: settings["payment.khaltiEnabled"] ?? "true",
                  type: "toggle",
                  hint: "Uses Khalti initiation and server-side lookup before marking paid.",
                },
              ]}
            />
          </AdminCard>

          <AdminCard className="p-5">
            <h3 className="font-display text-lg font-semibold">
              Environment status
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Read-only. Add secrets to <code className="font-mono">.env</code>{" "}
              or your Vercel project settings and redeploy.
            </p>
            <ul className="mt-4 space-y-3">
              {environment.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-xs">
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-[10px] leading-4 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <Banknote className="mr-1 inline size-3.5" />
              Refunds are recorded manually in the dashboard. Complete the
              actual refund in the provider portal or at the counter.
            </div>
          </AdminCard>
        </div>
      ) : null}

      {tab === "delivery" ? (
        <AdminCard className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold">
              Delivery zones
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Create a zone for each part of Biratnagar you deliver to. Fees and
              minimums are stored as integer paisa. Customers select a zone at
              checkout and always see the delivery fee before ordering.
            </p>
          </div>
          <DeliveryZoneAdmin
            zones={zones.map((zone) => ({
              id: zone.id,
              name: zone.name,
              fee: zone.fee,
              minOrder: zone.minOrder,
              sortOrder: zone.sortOrder,
              isActive: zone.isActive,
            }))}
          />
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-5 text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Delivery radius, fuel surcharges and rider availability are
            operational decisions. Confirm delivery boundaries and fees with the
            owner before launch.
          </div>
        </AdminCard>
      ) : null}

      {tab === "content" ? (
        <div className="space-y-4">
          <AdminCard className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-display text-2xl font-semibold">
                Hero & About copy
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Write in Purple Haze&apos;s voice. Avoid unverified claims about
                awards, years of service or ingredients.
              </p>
            </div>
            <SettingsForm
              group="content"
              fields={[
                {
                  key: "content.heroEyebrow",
                  label: "Hero eyebrow",
                  value: settings["content.heroEyebrow"] ?? "",
                },
                {
                  key: "content.heroTitle",
                  label: "Hero headline",
                  value: settings["content.heroTitle"] ?? "",
                  required: true,
                  fullWidth: true,
                },
                {
                  key: "content.heroSubtitle",
                  label: "Hero subtitle",
                  value: settings["content.heroSubtitle"] ?? "",
                  type: "textarea",
                  required: true,
                },
                {
                  key: "content.aboutTitle",
                  label: "About heading",
                  value: settings["content.aboutTitle"] ?? "",
                  required: true,
                  fullWidth: true,
                },
                {
                  key: "content.aboutBody",
                  label: "About paragraph",
                  value: settings["content.aboutBody"] ?? "",
                  type: "textarea",
                  required: true,
                },
                {
                  key: "seo.title",
                  label: "SEO title",
                  value: settings["seo.title"] ?? "",
                  required: true,
                  fullWidth: true,
                },
                {
                  key: "seo.description",
                  label: "SEO description",
                  value: settings["seo.description"] ?? "",
                  type: "textarea",
                  required: true,
                  hint: "Keep it around 150–160 characters for search results.",
                },
              ]}
            />
          </AdminCard>
          <AdminCard className="p-5">
            <h3 className="font-display text-lg font-semibold">
              Content management
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Gallery photos, homepage banners and permissioned testimonials are
              managed separately so each can be scheduled and moderated.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/content/gallery"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Gallery
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                href="/admin/content/banners"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Banners
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                href="/admin/content/testimonials"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Testimonials
              </Link>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </>
  );
}

function ShopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 10h16l-1.5 9h-13L4 10Z" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
