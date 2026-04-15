import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn("dashboard-panel rounded-[1.5rem] text-card-foreground", className)}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: CardProps) => (
  <div className={cn("flex flex-col gap-2 border-b border-border/70 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: CardProps) => (
  <div className={cn("font-heading text-lg font-semibold tracking-tight", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: CardProps) => (
  <div className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: CardProps) => (
  <div className={cn("p-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: CardProps) => (
  <div className={cn("border-t border-border/70 p-6", className)} {...props} />
);
