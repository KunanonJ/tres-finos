import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] motion-safe:transition-[color,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/15 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border/80 bg-background/60 text-muted-foreground",
        positive: "border-finance-positive/30 bg-finance-positive/10 text-finance-positive",
        warning: "border-finance-warning/30 bg-finance-warning/10 text-finance-warning",
        critical: "border-finance-critical/30 bg-finance-critical/10 text-finance-critical",
        info: "border-finance-info/30 bg-finance-info/10 text-finance-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
