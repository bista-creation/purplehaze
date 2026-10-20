"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Edit3, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  deleteVenueAction,
  saveVenueAction,
} from "@/actions/admin/catalogue";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  venueAdminSchema,
  type VenueAdminInput,
} from "@/lib/validations";
import { formatNPR, paisaToRupees } from "@/lib/money";
import type { ImageUploadMode } from "@/lib/upload-types";

export type VenueRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  image: string | null;
  capacity: number | null;
  priceFrom: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  bookingCount: number;
};

export function VenueAdmin({
  venues,
  uploadMode,
  imageOptions,
}: {
  venues: VenueRow[];
  uploadMode: ImageUploadMode;
  imageOptions: string[];
}) {
  const [dialog, setDialog] = useState<{ open: boolean; venue?: VenueRow }>({ open: false });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add venue
        </Button>
      </div>
      {venues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No venues yet. Add the garden, rooftop or banquet hall.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => (
            <article key={venue.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-[16/9] bg-muted">
                {venue.image ? (
                  <SmartImage
                    src={venue.image}
                    alt={venue.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Building2 className="size-8 text-muted-foreground/40" />
                  </div>
                )}
                <Badge
                  variant={venue.isActive ? "green" : "muted"}
                  className="absolute left-3 top-3"
                >
                  {venue.isActive ? "Live" : "Hidden"}
                </Badge>
              </div>
              <div className="p-4">
                <h2 className="font-display text-xl font-semibold">{venue.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {venue.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                    <Users className="size-3" />
                    {venue.capacity ? `${venue.capacity} guests` : "Capacity on request"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {venue.priceFrom ? `From ${formatNPR(venue.priceFrom)}` : "Price on request"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {venue.bookingCount} enquir{venue.bookingCount === 1 ? "y" : "ies"}
                  </span>
                </div>
                <div className="mt-4 flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialog({ open: true, venue })}
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </Button>
                  <ConfirmActionButton
                    action={deleteVenueAction.bind(null, venue.id)}
                    label="Delete"
                    title={`Delete ${venue.name}?`}
                    description="Venues with event enquiries cannot be deleted. Hide the venue instead."
                    confirmLabel="Delete venue"
                    variant="ghost"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog.open ? (
        <VenueDialog
          key={dialog.venue?.id ?? "new-venue"}
          venue={dialog.venue}
          uploadMode={uploadMode}
          imageOptions={imageOptions}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function VenueDialog({
  venue,
  uploadMode,
  imageOptions,
  onClose,
}: {
  venue?: VenueRow;
  uploadMode: ImageUploadMode;
  imageOptions: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<VenueAdminInput>({
    resolver: zodResolver(venueAdminSchema),
    defaultValues: {
      name: venue?.name ?? "",
      slug: venue?.slug ?? "",
      description: venue?.description ?? "",
      longDescription: venue?.longDescription ?? "",
      image: venue?.image ?? "",
      capacity: venue?.capacity ?? 0,
      priceFrom: venue?.priceFrom ? paisaToRupees(venue.priceFrom) : 0,
      features: venue?.features ?? [],
      isActive: venue?.isActive ?? true,
      sortOrder: venue?.sortOrder ?? 0,
    },
  });
  const image = useWatch({ control: form.control, name: "image" });
  const [features, setFeatures] = useState(venue?.features.join(", ") ?? "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venue ? `Edit ${venue.name}` : "Add a venue"}</DialogTitle>
          <DialogDescription>
            Venue details appear on the public Events & Venues page. Leave capacity or
            price at zero when they are only available on request.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveVenueAction(
                {
                  ...values,
                  features: features
                    .split(",")
                    .map((feature) => feature.trim())
                    .filter(Boolean),
                },
                venue?.id,
              );
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Venue name" htmlFor="venue-name" required error={form.formState.errors.name?.message}>
              <Input id="venue-name" {...form.register("name")} />
            </FormField>
            <FormField label="URL slug" htmlFor="venue-slug" error={form.formState.errors.slug?.message} hint="Optional. Generated from the name.">
              <Input id="venue-slug" {...form.register("slug")} />
            </FormField>
          </div>
          <FormField label="Short description" htmlFor="venue-description" required error={form.formState.errors.description?.message}>
            <Textarea id="venue-description" rows={2} {...form.register("description")} />
          </FormField>
          <FormField label="Long description" htmlFor="venue-long" error={form.formState.errors.longDescription?.message}>
            <Textarea id="venue-long" rows={4} {...form.register("longDescription")} />
          </FormField>
          <ImageUploadField
            id="venue-image"
            label="Venue photo"
            value={image ?? ""}
            onChange={(value) => form.setValue("image", value, { shouldDirty: true })}
            uploadMode={uploadMode}
            folder="venues"
            imageOptions={imageOptions}
            error={form.formState.errors.image?.message}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Capacity" htmlFor="venue-capacity" error={form.formState.errors.capacity?.message} hint="0 shows 'on request'.">
              <Input id="venue-capacity" type="number" min="0" {...form.register("capacity")} />
            </FormField>
            <FormField label="Starting price (NPR)" htmlFor="venue-price" error={form.formState.errors.priceFrom?.message} hint="0 shows 'price on request'.">
              <Input id="venue-price" type="number" min="0" step="0.01" {...form.register("priceFrom")} />
            </FormField>
          </div>
          <FormField label="Features" htmlFor="venue-features" hint="Comma separated, e.g. Garden lights, Stage, Air conditioning.">
            <Input
              id="venue-features"
              value={features}
              onChange={(event) => setFeatures(event.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Sort order" htmlFor="venue-sort" error={form.formState.errors.sortOrder?.message}>
              <Input id="venue-sort" type="number" min="0" {...form.register("sortOrder")} />
            </FormField>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...form.register("isActive")} />
              Show on the website
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save venue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
