import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Sparkles } from "lucide-react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicGallery } from "@/lib/queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A look around Purple Haze Restro & Garden — the garden, dining room, event spaces and food from our kitchen in Biratnagar.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const images = await getPublicGallery();

  return (
    <>
      <section className="hero-mesh border-b border-border/60 py-14 lg:py-20">
        <div className="container-page text-center">
          <Badge variant="gold" className="rounded-full px-3 py-1">
            <Camera className="size-3" /> A look around
          </Badge>
          <h1 className="display-title mx-auto mt-5 max-w-2xl">
            Golden hours at
            <br />
            <span className="text-gradient italic">Purple Haze.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Warm lights, leafy corners and plates made for sharing. Browse the
            spaces and imagine your next evening here.
          </p>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <GalleryGrid
          images={images.map((image) => ({
            id: image.id,
            url: image.url,
            title: image.title,
            category: image.category,
          }))}
        />
      </section>

      <section className="container-page pb-16 lg:pb-24">
        <div className="grid gap-6 rounded-2xl border border-dashed border-border bg-card/50 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-gold" /> A note on our photographs
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">
              Some images may be representative while the owner prepares the
              final photography from the restaurant. If you have a favourite
              picture from a visit, our team would love to see it. Please do not
              use images from this site without permission.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/contact">
              Share a photo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
