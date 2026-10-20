"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteToggleButton({
  dishId,
  initialFavorited,
  iconOnly = false,
  className,
}: {
  dishId: string;
  initialFavorited: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      className={cn(
        favorited ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
        className,
      )}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favourites" : "Save to favourites"}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleFavoriteAction(dishId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          setFavorited(Boolean(result.favorited));
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={cn("size-4", favorited && "fill-current")} />
      )}
      {iconOnly ? null : favorited ? "Saved" : "Save"}
    </Button>
  );
}
