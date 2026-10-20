"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2, MessageSquareQuote, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import {
  deleteTestimonialAction,
  saveTestimonialAction,
} from "@/actions/admin/content";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  testimonialAdminSchema,
  type TestimonialAdminInput,
} from "@/lib/validations";

export type TestimonialRow = {
  id: string;
  name: string;
  location: string | null;
  quote: string;
  rating: number;
  sortOrder: number;
  isActive: boolean;
};

export function TestimonialAdmin({ testimonials }: { testimonials: TestimonialRow[] }) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    testimonial?: TestimonialRow;
  }>({ open: false });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add testimonial
        </Button>
      </div>
      {testimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <MessageSquareQuote className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No testimonials yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Only publish real quotes with the guest&apos;s permission. Demo seed quotes are
            inactive placeholders.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={
                        index < testimonial.rating
                          ? "size-3.5 fill-gold text-gold"
                          : "size-3.5 text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
                <Badge variant={testimonial.isActive ? "green" : "muted"}>
                  {testimonial.isActive ? "Published" : "Hidden"}
                </Badge>
              </div>
              <blockquote className="mt-3 text-sm leading-6 text-muted-foreground">
                “{testimonial.quote}”
              </blockquote>
              <p className="mt-3 text-xs font-semibold">
                {testimonial.name}
                {testimonial.location ? (
                  <span className="font-normal text-muted-foreground"> · {testimonial.location}</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Sort {testimonial.sortOrder}</p>
              <div className="mt-4 flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialog({ open: true, testimonial })}
                >
                  <Edit3 className="size-3.5" /> Edit
                </Button>
                <ConfirmActionButton
                  action={deleteTestimonialAction.bind(null, testimonial.id)}
                  label=""
                  title="Delete this testimonial?"
                  description="The testimonial is removed from the website."
                  confirmLabel="Delete testimonial"
                  variant="ghost"
                  size="icon-sm"
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog.open ? (
        <TestimonialDialog
          key={dialog.testimonial?.id ?? "new-testimonial"}
          testimonial={dialog.testimonial}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function TestimonialDialog({
  testimonial,
  onClose,
}: {
  testimonial?: TestimonialRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<TestimonialAdminInput>({
    resolver: zodResolver(testimonialAdminSchema),
    defaultValues: {
      name: testimonial?.name ?? "",
      location: testimonial?.location ?? "",
      quote: testimonial?.quote ?? "",
      rating: testimonial?.rating ?? 5,
      sortOrder: testimonial?.sortOrder ?? 0,
      isActive: testimonial?.isActive ?? true,
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{testimonial ? "Edit testimonial" : "Add a testimonial"}</DialogTitle>
          <DialogDescription>
            Publish only after receiving permission from the guest. Keep the quote in
            their voice.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveTestimonialAction(values, testimonial?.id);
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
            <FormField label="Guest name" htmlFor="testimonial-name" required error={form.formState.errors.name?.message}>
              <Input id="testimonial-name" {...form.register("name")} />
            </FormField>
            <FormField label="Location / occasion" htmlFor="testimonial-location" error={form.formState.errors.location?.message}>
              <Input id="testimonial-location" placeholder="Biratnagar" {...form.register("location")} />
            </FormField>
          </div>
          <FormField label="Quote" htmlFor="testimonial-quote" required error={form.formState.errors.quote?.message}>
            <Textarea id="testimonial-quote" rows={4} {...form.register("quote")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Rating" htmlFor="testimonial-rating" error={form.formState.errors.rating?.message}>
              <select
                id="testimonial-rating"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...form.register("rating")}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} star{rating === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Sort order" htmlFor="testimonial-sort" error={form.formState.errors.sortOrder?.message}>
              <Input id="testimonial-sort" type="number" min="0" {...form.register("sortOrder")} />
            </FormField>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...form.register("isActive")} />
              Publish
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save testimonial
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
