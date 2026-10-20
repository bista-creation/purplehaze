import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { SITE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Purple Haze Restro & Garden | Biratnagar",
    template: "%s | Purple Haze Biratnagar",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Purple Haze Biratnagar",
    "restaurant in Biratnagar",
    "garden restaurant Nepal",
    "banquet hall Biratnagar",
    "food delivery Biratnagar",
    "momo Biratnagar",
    "Purple Haze Restro and Garden",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NP",
    url: SITE.url,
    siteName: SITE.name,
    title: "Purple Haze Restro & Garden | Biratnagar",
    description: SITE.description,
    images: [
      {
        url: "/images/hero/restaurant.jpg",
        width: 1800,
        height: 1200,
        alt: "Purple Haze Restro & Garden, Biratnagar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Purple Haze Restro & Garden | Biratnagar",
    description: SITE.description,
    images: ["/images/hero/restaurant.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  category: "restaurant",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8FF" },
    { media: "(prefers-color-scheme: dark)", color: "#130B1D" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NP" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} min-h-dvh font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
          >
            Skip to content
          </a>
          {children}
          <Toaster />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
