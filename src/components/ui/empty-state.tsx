import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && (actionHref || actionOnClick) ? (
        actionHref ? (
          <Button asChild className="mt-6">
            <Link href={actionHref} onClick={actionOnClick}>
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button className="mt-6" onClick={actionOnClick}>
            {actionLabel}
          </Button>
        )
      ) : null}
      {children}
    </div>
  );
}
