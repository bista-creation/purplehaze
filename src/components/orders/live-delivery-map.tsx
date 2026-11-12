"use client";

import { useState } from "react";
import {
  Bike,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export interface LiveDeliveryMapProps {
  riderLocation: {
    lat: number;
    lng: number;
    updatedAt?: string;
    isStale?: boolean;
  } | null;
  restaurantLocation?: { lat: number; lng: number };
  destinationAddress?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  orderNumber?: string;
  className?: string;
  compact?: boolean;
}

export function LiveDeliveryMap({
  riderLocation,
  restaurantLocation = SITE.coordinates,
  destinationAddress,
  riderName,
  riderPhone,
  orderNumber,
  className,
  compact = false,
}: LiveDeliveryMapProps) {
  const [mapProvider, setMapProvider] = useState<"google" | "osm">("osm");

  const activeLat = riderLocation?.lat ?? restaurantLocation.lat;
  const activeLng = riderLocation?.lng ?? restaurantLocation.lng;
  const hasRiderPin = Boolean(riderLocation);

  // OpenStreetMap embed URL with bounded bounding box centered on coordinates
  const delta = 0.008;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - delta}%2C${activeLat - delta}%2C${activeLng + delta}%2C${activeLat + delta}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;

  // Google Maps embed URL
  const googleEmbedUrl = `https://maps.google.com/maps?q=${activeLat},${activeLng}&z=16&output=embed`;

  const externalMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeLat}%2C${activeLng}`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Compass className={cn("size-4", hasRiderPin && !riderLocation?.isStale && "animate-spin")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {hasRiderPin ? "Live Delivery Tracking" : "Awaiting Rider Dispatch"}
              </span>
              {orderNumber && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{orderNumber}
                </span>
              )}
            </div>
            {riderName && (
              <p className="text-[11px] text-muted-foreground">
                Rider: <strong className="text-foreground">{riderName}</strong>
                {riderPhone ? ` (${riderPhone})` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasRiderPin ? (
            <Badge
              variant={riderLocation?.isStale ? "amber" : "green"}
              className="h-6 text-[10px] font-semibold"
            >
              {riderLocation?.isStale ? "Reconnecting (stale)" : "Live GPS (12s)"}
            </Badge>
          ) : (
            <Badge variant="muted" className="h-6 text-[10px]">
              At Kitchen
            </Badge>
          )}

          {/* Map Layer Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setMapProvider("osm")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                mapProvider === "osm"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              OSM
            </button>
            <button
              type="button"
              onClick={() => setMapProvider("google")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                mapProvider === "google"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Google
            </button>
          </div>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className={cn("relative w-full bg-muted/20", compact ? "h-64 sm:h-72" : "h-80 sm:h-96")}>
        <iframe
          key={`${mapProvider}-${activeLat.toFixed(4)}-${activeLng.toFixed(4)}`}
          title={`Delivery Map (${orderNumber || "Live"})`}
          src={mapProvider === "osm" ? osmEmbedUrl : googleEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Floating Quick Navigation Action */}
        <div className="absolute bottom-3 right-3 z-10">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 rounded-full border border-border/80 bg-background/95 px-3 text-xs font-semibold shadow-md backdrop-blur-sm hover:bg-background"
          >
            <a href={externalMapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="size-3 text-primary" />
              <span>Open in Google Maps</span>
              <ExternalLink className="size-2.5 opacity-60" />
            </a>
          </Button>
        </div>

        {/* Stale Warning Banner */}
        {riderLocation?.isStale && (
          <div className="absolute top-3 left-3 right-3 z-10 rounded-xl border border-amber-500/40 bg-amber-500/90 px-3 py-2 text-xs font-medium text-amber-950 shadow-md backdrop-blur-sm dark:bg-amber-950/90 dark:text-amber-200">
            Signal updating: Rider phone may be in a dead zone or screen is locked in pocket.
          </div>
        )}
      </div>

      {/* Address & Trip Route Ribbon */}
      <div className="space-y-2 border-t border-border/70 bg-card p-3 text-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Restaurant Origin */}
          <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-2">
            <Store className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="block font-semibold text-foreground">Pickup</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Purple Haze, Airport Road, Biratnagar
              </span>
            </div>
          </div>

          {/* Customer Destination */}
          <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <span className="block font-semibold text-foreground">Delivery To</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {destinationAddress || "Customer address"}
              </span>
            </div>
          </div>
        </div>

        {riderLocation && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Bike className="size-3 text-primary" />
              GPS: {riderLocation.lat.toFixed(5)}, {riderLocation.lng.toFixed(5)}
            </span>
            {riderLocation.updatedAt && (
              <span>Updated: {new Date(riderLocation.updatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
