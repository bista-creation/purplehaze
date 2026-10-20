import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Purple Haze",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8FF",
    theme_color: "#1A1025",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-NP",
    categories: ["food", "restaurant", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Order food",
        short_name: "Menu",
        description: "Browse the Purple Haze menu",
        url: "/menu",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Reserve a table",
        short_name: "Reserve",
        description: "Request a table at Purple Haze",
        url: "/reservations",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Track order",
        short_name: "Track",
        description: "Track your Purple Haze order",
        url: "/track",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
