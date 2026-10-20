"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Images, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteGalleryImageAction,
  saveGalleryImageAction,
} from "@/actions/admin/content";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SmartImage } from "@/components/ui/smart-image";
import { galleryAdminSchema, type GalleryAdminInput } from "@/lib/validations";

export type GalleryRow = {
  id: string;
  url: string;
  title: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export function GalleryAdmin({
  images,
  uploadEnabled,
}: {
  images: GalleryRow[];
  uploadEnabled: boolean;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; image?: GalleryRow }>({
    open: false,
  });
  const categories = [...new Set(images.map((image) => image.category))];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add photo
        </Button>
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Images className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No gallery photos yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload real restaurant photography only. Do not copy images from
            Facebook without permission.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <article
              key={image.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-[4/3] bg-muted">
                <SmartImage
                  src={image.url}
                  alt={image.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover"
                />
                <Badge
                  variant={image.isActive ? "green" : "muted"}
                  className="absolute left-2 top-2"
                >
                  {image.isActive ? "Live" : "Hidden"}
                </Badge>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{image.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {image.category} · sort {image.sortOrder}
                </p>
                <div className="mt-3 flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog({ open: true, image })}
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </Button>
                  <ConfirmActionButton
                    action={deleteGalleryImageAction.bind(null, image.id)}
                    label=""
                    title="Delete this photo?"
                    description="The photo is removed from the public gallery. The image file itself is not deleted from storage."
                    confirmLabel="Delete photo"
                    variant="ghost"
                    size="icon-sm"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog.open ? (
        <GalleryDialog
          key={dialog.image?.id ?? "new-gallery"}
          image={dialog.image}
          categories={categories}
          uploadEnabled={uploadEnabled}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function GalleryDialog({
  image,
  categories,
  uploadEnabled,
  onClose,
}: {
  image?: GalleryRow;
  categories: string[];
  uploadEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<GalleryAdminInput>({
    resolver: zodResolver(galleryAdminSchema),
    defaultValues: {
      url: image?.url ?? "",
      title: image?.title ?? "",
      category: image?.category ?? "Restaurant",
      sortOrder: image?.sortOrder ?? 0,
      isActive: image?.isActive ?? true,
    },
  });
  const url = useWatch({ control: form.control, name: "url" });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {image ? "Edit photo" : "Add a gallery photo"}
          </DialogTitle>
          <DialogDescription>
            Use real photos of Purple Haze with permission. Add a clear title
            and a category so guests can filter the gallery.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveGalleryImageAction(values, image?.id);
              if (result.success) {
                toast.success(result.message);
                router.refresh();
                onClose();
              } else {
                toast.error(result.message);
              }
            });
          })}
        >
          <ImageUploadField
            id="gallery-url"
            label="Photo"
            value={url ?? ""}
            onChange={(value) =>
              form.setValue("url", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            uploadEnabled={uploadEnabled}
            error={form.formState.errors.url?.message}
          />
          <FormField
            label="Title / alt text"
            htmlFor="gallery-title"
            required
            error={form.formState.errors.title?.message}
          >
            <Input
              id="gallery-title"
              {...form.register("title")}
              placeholder="Garden dining at dusk"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Category"
              htmlFor="gallery-category"
              error={form.formState.errors.category?.message}
            >
              <Input
                id="gallery-category"
                list="gallery-categories"
                {...form.register("category")}
              />
              <datalist id="gallery-categories">
                {[
                  ...new Set([
                    ...categories,
                    "Restaurant",
                    "Food",
                    "Events",
                    "Garden",
                  ]),
                ].map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </FormField>
            <FormField
              label="Sort order"
              htmlFor="gallery-sort"
              error={form.formState.errors.sortOrder?.message}
            >
              <Input
                id="gallery-sort"
                type="number"
                min="0"
                {...form.register("sortOrder")}
              />
            </FormField>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register("isActive")}
              />
              Visible
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save photo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
