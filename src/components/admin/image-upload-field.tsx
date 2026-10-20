"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Images, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadThing } from "@/lib/uploadthing";
import type {
  ImageFolder,
  ImageUploadMode,
} from "@/lib/upload-types";

export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  uploadMode,
  uploadEnabled,
  folder = "menu",
  imageOptions = [],
  hint,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  uploadMode?: ImageUploadMode;
  /** Legacy boolean used by older admin forms. */
  uploadEnabled?: boolean;
  folder?: ImageFolder;
  imageOptions?: string[];
  hint?: string;
  error?: string;
}) {
  const mode: ImageUploadMode =
    uploadMode ?? (uploadEnabled ? "uploadthing" : "none");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const { startUpload } = useUploadThing("adminImage", {
    onClientUploadComplete: (files) => {
      setUploading(false);
      const url = files[0]?.ufsUrl;
      if (url) {
        onChange(url);
        setRecentUploads((current) => [
          url,
          ...current.filter((entry) => entry !== url),
        ]);
        toast.success("Image uploaded.");
      }
    },
    onUploadError: (uploadError) => {
      setUploading(false);
      toast.error(uploadError.message || "The image could not be uploaded.");
    },
  });

  const library = [...new Set([...recentUploads, ...imageOptions])];
  const canUpload = mode !== "none";
  const resolvedHint =
    hint ??
    (mode === "uploadthing"
      ? "Upload a JPG, PNG or WebP, choose an existing photo, or paste an image path."
      : "Upload a JPG, PNG or WebP, choose an existing photo, or paste a path under /images.");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Please choose an image under 8 MB.");
      return;
    }

    if (mode === "uploadthing") {
      setUploading(true);
      await startUpload([file]);
      return;
    }

    if (mode === "local") {
      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(`/api/admin/uploads/${folder}`, {
          method: "POST",
          body,
        });
        const data = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !data.url) {
          throw new Error(data.error || "The image could not be uploaded.");
        }
        onChange(data.url);
        setRecentUploads((current) => [
          data.url!,
          ...current.filter((entry) => entry !== data.url),
        ]);
        toast.success("Image uploaded and ready to save.");
      } catch (uploadError) {
        toast.error(
          uploadError instanceof Error
            ? uploadError.message
            : "The image could not be uploaded.",
        );
      } finally {
        setUploading(false);
      }
      return;
    }

    toast.error("Image uploads are not enabled in this environment.");
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-[4/3] w-full max-w-[10rem] overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            <SmartImage
              key={value}
              src={value}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-[10px] uppercase tracking-wider text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/images/menu/dish.jpg or https://…"
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            {resolvedHint}
          </p>
          <div className="flex flex-wrap gap-2">
            {canUpload ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void handleFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload photo"}
                </Button>
              </>
            ) : null}
            {library.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
              >
                <Images className="size-4" />
                Photo library
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {library.length}
                </span>
              </Button>
            ) : null}
          </div>
          {mode === "none" ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Uploads are unavailable on this serverless deployment. Configure{" "}
              <code className="font-mono">UPLOADTHING_TOKEN</code>, or add the
              photo under <code className="font-mono">public/images</code> and
              paste its path.
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="size-5 text-primary" />
              Choose a {folder === "menu" ? "dish" : "venue"} photo
            </DialogTitle>
            <DialogDescription>
              These are photos already stored with the website. Selecting one
              updates the field above — remember to save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {library.map((url) => {
              const selected = value === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    onChange(url);
                    setLibraryOpen(false);
                  }}
                  className={
                    selected
                      ? "group relative aspect-square overflow-hidden rounded-xl border-2 border-primary ring-2 ring-primary/20"
                      : "group relative aspect-square overflow-hidden rounded-xl border border-border transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                  }
                >
                  <SmartImage
                    src={url}
                    alt={url.split("/").at(-1) ?? "Dish photo"}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-left text-[9px] font-medium text-white">
                    {url.split("/").at(-1)}
                  </span>
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
