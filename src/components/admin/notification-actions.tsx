"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "@/actions/admin/notifications";
import { Button } from "@/components/ui/button";

export function NotificationActions({
  notificationId,
  isRead,
}: {
  notificationId: string;
  isRead: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-[11px]"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = isRead
            ? await markNotificationUnreadAction(notificationId)
            : await markNotificationReadAction(notificationId);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isRead ? (
        <Undo2 className="size-3" />
      ) : (
        <Check className="size-3" />
      )}
      {isRead ? "Mark unread" : "Acknowledge"}
    </Button>
  );
}
