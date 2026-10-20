import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        gold: "border-transparent bg-gold/20 text-amber-800 dark:text-amber-200",
        green:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
        red: "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
        blue: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
        violet:
          "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
        amber:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
