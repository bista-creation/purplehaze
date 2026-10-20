"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getReorderLinesAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

export function ReorderButton({
  orderId,
  variant = "outline",
}: {
  orderId: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await getReorderLinesAction(orderId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          if (result.lines.length === 0) {
            toast.error("None of those dishes are available right now.");
            return;
          }
          for (const line of result.lines) addItem(line);
          if (result.skipped > 0) {
            toast.warning(
              `${result.skipped} unavailable item${result.skipped === 1 ? "" : "s"} skipped.`,
            );
          }
          toast.success("Order added to your cart.");
          openCart();
          router.push("/cart");
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RotateCcw className="size-4" />
      )}
      Reorder
    </Button>
  );
}
