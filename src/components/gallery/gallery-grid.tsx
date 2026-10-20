"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
  category: string;
}

export function GalleryGrid({ images }: { images: GalleryItem[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(images.map((image) => image.category)))],
    [images],
  );
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? images
        : images.filter((image) => image.category === activeCategory),
    [activeCategory, images],
  );
  const selected =
    selectedIndex === null ? null : (filtered[selectedIndex] ?? null);
  const currentIndex = selectedIndex ?? 0;

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setSelectedIndex((index) =>
          index === null ? null : (index - 1 + filtered.length) % filtered.length,
        );
      }
      if (event.key === "ArrowRight") {
        setSelectedIndex((index) =>
          index === null ? null : (index + 1) % filtered.length,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, filtered.length]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center">
        <ImageOff className="size-10 text-muted-foreground" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          The gallery is being prepared
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Our team is adding fresh photographs of the food, garden and event
          spaces. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={activeCategory === category ? "default" : "outline"}
            onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-3 sm:columns-2 lg:columns-3 [&>*]:mb-3">
        {filtered.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${image.title}`}
          >
            <div
              className={cn(
                "relative w-full",
                index % 5 === 0
                  ? "aspect-[4/5]"
                  : index % 3 === 0
                    ? "aspect-square"
                    : "aspect-[4/3]",
              )}
            >
              <SmartImage
                src={image.url}
                alt={image.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 opacity-0 transition group-hover:opacity-100">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                  {image.category}
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {image.title}
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/20 bg-ink/30 text-white backdrop-blur">
                <Expand className="size-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => setSelectedIndex(open ? selectedIndex : null)}
      >
        <DialogContent className="max-w-5xl gap-3 p-2 sm:p-3">
          <DialogTitle className="sr-only">{selected?.title ?? "Gallery"}</DialogTitle>
          <DialogDescription className="sr-only">
            Use the arrow buttons or keyboard arrow keys to move through the
            gallery.
          </DialogDescription>
          {selected ? (
            <>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black sm:aspect-[16/10]">
                <SmartImage
                  src={selected.url}
                  alt={selected.title}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
                {filtered.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Previous image"
                      onClick={() =>
                        setSelectedIndex(
                          (currentIndex - 1 + filtered.length) % filtered.length,
                        )
                      }
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Next image"
                      onClick={() => setSelectedIndex((currentIndex + 1) % filtered.length)}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 px-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {selected.category}
                  </p>
                  <p className="text-sm font-medium">{selected.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {filtered.length}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
