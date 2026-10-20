"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, ImageIcon, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteBannerAction, saveBannerAction } from "@/actions/admin/content";
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
import { Textarea } from "@/components/ui/textarea";
import { bannerAdminSchema, type BannerAdminInput } from "@/lib/validations";
import { formatDateTime, toNepalDateTimeLocal } from "@/lib/utils";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export function BannerAdmin({
  banners,
  uploadEnabled,
}: {
  banners: BannerRow[];
  uploadEnabled: boolean;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; banner?: BannerRow }>({
    open: false,
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add banner
        </Button>
      </div>
      {banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ImageIcon className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No banners yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The first active banner appears on the homepage below the gallery
            strip.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <article
              key={banner.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-[16/7] w-full bg-muted sm:w-60 sm:shrink-0">
                  {banner.image ? (
                    <SmartImage
                      src={banner.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 240px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <ImageIcon className="size-7 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={banner.isActive ? "green" : "muted"}>
                        {banner.isActive ? "Active" : "Hidden"}
                      </Badge>
                      <Badge variant="violet">Sort {banner.sortOrder}</Badge>
                      {banner.startsAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          From {formatDateTime(banner.startsAt)}
                        </span>
                      ) : null}
                      {banner.endsAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          Until {formatDateTime(banner.endsAt)}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-display text-xl font-semibold">
                      {banner.title}
                    </h2>
                    {banner.subtitle ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {banner.subtitle}
                      </p>
                    ) : null}
                    {banner.ctaLabel && banner.ctaHref ? (
                      <p className="mt-2 text-[11px] text-primary">
                        Button: {banner.ctaLabel} → {banner.ctaHref}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDialog({ open: true, banner })}
                    >
                      <Edit3 className="size-3.5" /> Edit
                    </Button>
                    <ConfirmActionButton
                      action={deleteBannerAction.bind(null, banner.id)}
                      label=""
                      title="Delete this banner?"
                      description="The banner is removed from the homepage. If it is seasonal, hide it instead so you can reuse it later."
                      confirmLabel="Delete banner"
                      variant="ghost"
                      size="icon-sm"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog.open ? (
        <BannerDialog
          key={dialog.banner?.id ?? "new-banner"}
          banner={dialog.banner}
          uploadEnabled={uploadEnabled}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function BannerDialog({
  banner,
  uploadEnabled,
  onClose,
}: {
  banner?: BannerRow;
  uploadEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<BannerAdminInput>({
    resolver: zodResolver(bannerAdminSchema),
    defaultValues: {
      title: banner?.title ?? "",
      subtitle: banner?.subtitle ?? "",
      image: banner?.image ?? "",
      ctaLabel: banner?.ctaLabel ?? "",
      ctaHref: banner?.ctaHref ?? "",
      sortOrder: banner?.sortOrder ?? 0,
      startsAt: banner?.startsAt
        ? toNepalDateTimeLocal(new Date(banner.startsAt))
        : "",
      endsAt: banner?.endsAt
        ? toNepalDateTimeLocal(new Date(banner.endsAt))
        : "",
      isActive: banner?.isActive ?? true,
    },
  });
  const image = useWatch({ control: form.control, name: "image" });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? "Edit banner" : "Add a homepage banner"}
          </DialogTitle>
          <DialogDescription>
            Keep calls to action pointing to real pages on this website.
            Schedule a start and end in Nepal time for seasonal offers.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveBannerAction(values, banner?.id);
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
          <FormField
            label="Title"
            htmlFor="banner-title"
            required
            error={form.formState.errors.title?.message}
          >
            <Input id="banner-title" {...form.register("title")} />
          </FormField>
          <FormField
            label="Subtitle"
            htmlFor="banner-subtitle"
            error={form.formState.errors.subtitle?.message}
          >
            <Textarea
              id="banner-subtitle"
              rows={2}
              {...form.register("subtitle")}
            />
          </FormField>
          <ImageUploadField
            id="banner-image"
            label="Background image"
            value={image ?? ""}
            onChange={(value) =>
              form.setValue("image", value, { shouldDirty: true })
            }
            uploadEnabled={uploadEnabled}
            error={form.formState.errors.image?.message}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Button label"
              htmlFor="banner-cta-label"
              error={form.formState.errors.ctaLabel?.message}
            >
              <Input
                id="banner-cta-label"
                placeholder="Book a table"
                {...form.register("ctaLabel")}
              />
            </FormField>
            <FormField
              label="Button link"
              htmlFor="banner-cta-href"
              error={form.formState.errors.ctaHref?.message}
              hint="e.g. /reservations"
            >
              <Input
                id="banner-cta-href"
                placeholder="/reservations"
                {...form.register("ctaHref")}
              />
            </FormField>
            <FormField
              label="Sort order"
              htmlFor="banner-sort"
              error={form.formState.errors.sortOrder?.message}
            >
              <Input
                id="banner-sort"
                type="number"
                min="0"
                {...form.register("sortOrder")}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Starts (Nepal)"
              htmlFor="banner-start"
              error={form.formState.errors.startsAt?.message}
            >
              <Input
                id="banner-start"
                type="datetime-local"
                {...form.register("startsAt")}
              />
            </FormField>
            <FormField
              label="Ends (Nepal)"
              htmlFor="banner-end"
              error={form.formState.errors.endsAt?.message}
            >
              <Input
                id="banner-end"
                type="datetime-local"
                {...form.register("endsAt")}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...form.register("isActive")}
            />
            Banner is active
          </label>
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
              Save banner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
