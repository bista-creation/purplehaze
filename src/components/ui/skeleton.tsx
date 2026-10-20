import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-secondary/80 dark:bg-secondary/50",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
