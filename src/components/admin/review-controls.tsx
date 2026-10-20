"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Star, X } from "lucide-react";
import { toast } from "sonner";
import {
  deleteReviewAction,
  setReviewStatusAction,
} from "@/actions/admin/content";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Button } from "@/components/ui/button";

export function ReviewControls({
  reviewId,
  isApproved,
  isFeatured,
}: {
  reviewId: string;
  isApproved: boolean;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(input: { isApproved?: boolean; isFeatured?: boolean }) {
    startTransition(async () => {
      const result = await setReviewStatusAction(reviewId, input);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={isApproved ? "outline" : "default"}
        disabled={pending}
        onClick={() => update({ isApproved: !isApproved })}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isApproved ? (
          <X className="size-3.5" />
        ) : (
          <Check className="size-3.5" />
        )}
        {isApproved ? "Unapprove" : "Approve"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={isFeatured ? "gold" : "outline"}
        disabled={pending || !isApproved}
        onClick={() => update({ isFeatured: !isFeatured })}
      >
        {isFeatured ? <Star className="size-3.5 fill-current" /> : <Sparkles className="size-3.5" />}
        {isFeatured ? "Unfeature" : "Feature"}
      </Button>
      <ConfirmActionButton
        action={deleteReviewAction.bind(null, reviewId)}
        label="Delete"
        title="Delete this review?"
        description="The review is removed permanently from the dashboard and the public site."
        confirmLabel="Delete review"
        variant="ghost"
      />
    </div>
  );
}
