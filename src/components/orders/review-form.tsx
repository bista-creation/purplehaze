"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { submitReviewAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReviewForm({
  orderId,
  token,
}: {
  orderId: string;
  token?: string | null;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (success) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Thank you for the kind words.</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Your review is waiting for a quick check by our team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (rating < 1) {
          toast.error("Choose a star rating first.");
          return;
        }
        startTransition(async () => {
          const result = await submitReviewAction({
            orderId,
            token,
            rating,
            title,
            comment,
          });
          if (result.success) {
            toast.success(result.message);
            setSuccess(true);
          } else {
            toast.error(result.message);
          }
        });
      }}
      className="space-y-4"
    >
      <fieldset>
        <legend className="text-sm font-semibold">How was your meal?</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="rounded p-0.5"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
            >
              <Star
                className={cn(
                  "size-7 transition",
                  (hovered || rating) >= star
                    ? "fill-gold text-gold"
                    : "text-muted-foreground/35",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>
      <FormField label="Headline" htmlFor="review-title">
        <Input
          id="review-title"
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A garden dinner worth repeating"
        />
      </FormField>
      <FormField
        label="Your review"
        htmlFor="review-comment"
        hint="Minimum 5 characters. Reviews are moderated before publishing."
        required
      >
        <Textarea
          id="review-comment"
          value={comment}
          maxLength={1500}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What did you enjoy? How was the food and service?"
          rows={4}
          required
        />
      </FormField>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send my review
      </Button>
    </form>
  );
}
