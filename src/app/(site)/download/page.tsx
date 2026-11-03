import type { Metadata } from "next";
import Link from "next/link";
import {
  Apple,
  ArrowDownToLine,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  HelpCircle,
  MapPin,
  Navigation,
  QrCode,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Download Purple Haze Mobile App | Android APK & iOS iPhone",
  description:
    "Get the official Purple Haze Restro & Garden mobile app. Download the standalone Android APK or install directly on iPhone/iPad via Safari with Maya AI, live GPS tracking, and exclusive treats.",
  alternates: { canonical: "/download" },
};

const features = [
  {
    icon: Bot,
    title: "Maya AI Food Assistant",
    description:
      "Chat or speak with Maya for personalized dish recommendations, ingredient guidance, and dietary options tailored to your taste.",
    tag: "AI Powered",
  },
  {
    icon: Navigation,
    title: "Real-Time Live Rider GPS",
    description:
      "Watch your order travel live from our garden kitchen on Airport Road right to your doorstep in Biratnagar.",
    tag: "Live Tracking",
  },
  {
    icon: Zap,
    title: "Faster One-Tap Ordering",
    description:
      "Save your favorite Biratnagar delivery landmarks, reorder past feasts with one tap, and pay effortlessly via Khalti, Fonepay, or Cash on Delivery.",
    tag: "Instant Checkout",
  },
  {
    icon: Sparkles,
    title: "Exclusive Mobile Offers",
    description:
      "Access mobile-only coupons, flash promotions, and special chef's tastings available exclusively on the mobile app.",
    tag: "App Treats",
  },
];

const androidInstallSteps = [
  {
    step: "01",
    title: "Download the APK",
    description:
      'Tap the "Download Android APK" button below to download the official purplehaze.apk file to your device.',
  },
  {
    step: "02",
    title: "Open the Downloaded File",
    description:
      'Once the download finishes, tap the notification or open the file from your phone\'s "Downloads" folder.',
  },
  {
    step: "03",
    title: "Allow Unknown Sources & Install",
    description:
      'If Android shows a prompt, tap "Settings", enable "Allow from this source", and press "Install". Open the app and enjoy!',
  },
];

const iosInstallSteps = [
  {
    step: "01",
    title: "Open in Safari on iPhone",
    description:
      'Open purplehaze-mobile.vercel.app in Apple Safari (or tap the "Launch iOS Web App" button below).',
  },
  {
    step: "02",
    title: "Tap the Share Icon",
    description:
      'At the bottom toolbar of Safari, tap the Share button (the square with an arrow pointing upward).',
  },
  {
    step: "03",
    title: "Tap 'Add to Home Screen'",
    description:
      'Scroll down in the share sheet and tap "Add to Home Screen", then tap "Add". Purple Haze will install with its native icon and run fullscreen!',
  },
];

const faqs = [
  {
    question: "How do iPhone users install the app?",
    answer:
      "Because Apple restricts direct .ipa sideloading from browsers, iOS users can install our official Progressive Web App (PWA) via Safari in 10 seconds: Open purplehaze-mobile.vercel.app → tap Share → tap 'Add to Home Screen'. It runs in full screen with push notifications and zero App Store download limits.",
  },
  {
    question: "Is the Android APK safe to install?",
    answer:
      "Yes, 100%. This is the official Purple Haze customer app built and signed directly from our production repository. It contains zero ads and zero third-party tracking.",
  },
  {
    question: "Which phones and versions are supported?",
    answer:
      "Android: Any device running Android 8.0 (Oreo) or newer (Samsung, Xiaomi, Redmi, Poco, Vivo, Oppo, Realme, OnePlus, etc.). iOS: Any iPhone or iPad running iOS 14.0 or newer.",
  },
  {
    question: "Can I use TestFlight or Expo Go on iPhone?",
    answer:
      "Yes! If you are a beta tester or developer with TestFlight or Expo Go installed on your iPhone, you can open project @bistacreation/purplehaze-mobile directly. Contact our team to request a direct TestFlight invitation.",
  },
  {
    question: "Will my website account and cart work in the app?",
    answer:
      "Yes! Sign in with your phone number or account to access your existing order history, loyalty status, and saved delivery addresses across both web and mobile.",
  },
];

export default function DownloadPage() {
  const expoBuildUrl =
    "https://expo.dev/accounts/bistacreation/projects/purplehaze-mobile/builds/c8ad9dc1-2da0-4919-88cd-84dc009a718f";
  const apkDownloadUrl = "/api/download/apk";
  const iosAppUrl = "https://purplehaze-mobile.vercel.app";

  return (
    <div className="relative overflow-hidden">
      {/* Background glowing effects */}
      <div
        className="pointer-events-none absolute -left-20 top-20 size-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/3 size-96 rounded-full bg-gold/10 blur-3xl"
        aria-hidden
      />

      {/* Hero Section */}
      <section className="container-page pb-16 pt-12 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="gold"
                  className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                >
                  <Smartphone className="mr-1.5 size-3.5" /> Android &amp; iPhone (iOS)
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  Official Mobile Release · v1.0.0
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="display-title mt-5 text-4xl sm:text-5xl lg:text-6xl">
                The Purple Haze experience,{" "}
                <span className="text-gradient italic">in your pocket.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Order your favorite dishes from our Airport Road garden, track
                your rider live on an interactive map, and let Maya AI guide
                your palate with instant recommendations. Available for both Android and iPhone users.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 gap-2.5 px-6 shadow-lg shadow-primary/20">
                  <a href={apkDownloadUrl} download="purplehaze.apk">
                    <ArrowDownToLine className="size-5" />
                    <span>Download Android APK</span>
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2.5 border-border/80 px-6"
                >
                  <a
                    href={iosAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Apple className="size-5" />
                    <span>Install on iPhone (iOS)</span>
                  </a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  Verified &amp; Safe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-gold" />
                  Free Direct Download
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  Biratnagar, Nepal
                </span>
              </div>
            </Reveal>
          </div>

          {/* Right Phone Visual Card */}
          <div className="lg:col-span-5">
            <Reveal delay={0.2}>
              <div className="relative mx-auto max-w-sm rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/90 to-background p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Smartphone className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Purple Haze App</h2>
                      <p className="text-[11px] text-muted-foreground">
                        Android &amp; iOS Support
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Live v1.0.0
                  </Badge>
                </div>

                <div className="my-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                    <Bot className="size-5 text-primary shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Maya AI Companion</p>
                      <p className="text-muted-foreground">Voice &amp; chat ordering</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                    <Navigation className="size-5 text-gold shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Live Rider Map</p>
                      <p className="text-muted-foreground">Track order in real-time</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                    <Zap className="size-5 text-amber-500 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Fastest Mobile Checkout</p>
                      <p className="text-muted-foreground">Khalti, Fonepay &amp; Cash</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-center">
                  <QrCode className="mx-auto size-12 text-gold opacity-90" />
                  <p className="mt-2 text-xs font-semibold">Scan with phone camera</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Direct access for Android &amp; iPhone
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button asChild size="sm" className="gap-1.5 text-xs">
                    <a href={apkDownloadUrl} download="purplehaze.apk">
                      <ArrowDownToLine className="size-3.5" />
                      Android APK
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                    <a href={iosAppUrl} target="_blank" rel="noopener noreferrer">
                      <Apple className="size-3.5" />
                      iPhone (iOS)
                    </a>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* iPhone (iOS) Dedicated Section */}
      <section id="ios" className="border-t border-border/60 bg-muted/30 py-16 md:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                <Apple className="mr-1.5 size-3.5" /> iPhone &amp; iPad Guide
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                How to install on iPhone in 3 steps
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Apple restricts downloading .ipa files directly from browsers. You can install the full Purple Haze app directly onto your iPhone home screen in seconds via Safari.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {iosInstallSteps.map((step, idx) => (
                <Reveal key={step.step} delay={idx * 0.1}>
                  <div className="relative flex h-full flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl font-bold text-gold">
                        {step.step}
                      </span>
                      {idx === 0 ? (
                        <Compass className="size-5 text-muted-foreground" />
                      ) : idx === 1 ? (
                        <Share2 className="size-5 text-muted-foreground" />
                      ) : (
                        <Apple className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8">
                <a href={iosAppUrl} target="_blank" rel="noopener noreferrer">
                  <Apple className="size-4" />
                  <span>Launch iOS App Now</span>
                  <ExternalLink className="size-3.5 opacity-70" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a href="mailto:support@purplehazerestro.com?subject=iOS%20TestFlight%20Beta%20Access">
                  <span>Request TestFlight Beta</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Android Step by Step Guide */}
      <section id="android" className="border-t border-border/60 py-16 md:py-24">
        <div className="container-page">
          <Reveal className="text-center">
            <Badge variant="gold" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Smartphone className="mr-1.5 size-3.5" /> Android Installation
            </Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              How to install APK on Android
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Installing the standalone APK gives you instant updates and exclusive deals with no Google account needed.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {androidInstallSteps.map((step, idx) => (
              <Reveal key={step.step} delay={idx * 0.1}>
                <div className="relative flex h-full flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                  <span className="font-display text-2xl font-bold text-gold">
                    {step.step}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 px-8">
              <a href={apkDownloadUrl} download="purplehaze.apk">
                <ArrowDownToLine className="size-4" />
                <span>Download APK for Android</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href={expoBuildUrl} target="_blank" rel="noopener noreferrer">
                <span>View EAS Build Status</span>
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/60 bg-muted/20 py-16 md:py-24">
        <div className="container-page">
          <Reveal className="text-center">
            <Badge variant="gold" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              Mobile Exclusive
            </Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Everything you love, made faster
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Crafted specifically for diners in Biratnagar who love delicious food, swift delivery, and seamless service.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.08}>
                <div className="group relative flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-gold/50 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <item.icon className="size-5" />
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border/60 py-16 md:py-24">
        <div className="container-page max-w-3xl">
          <Reveal className="text-center">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HelpCircle className="size-5" />
            </div>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              Frequently asked questions
            </h2>
          </Reveal>

          <div className="mt-10 space-y-4">
            {faqs.map((faq, idx) => (
              <Reveal key={faq.question} delay={idx * 0.06}>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
