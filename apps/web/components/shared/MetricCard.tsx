import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "positive" | "warning" | "critical" | "info";
  delta?: string;
}

const badgeVariantByTone = {
  positive: "positive",
  warning: "warning",
  critical: "critical",
  info: "info",
} as const;

export const MetricCard = ({
  delta,
  hint,
  icon: Icon,
  tone,
  title,
  value,
}: MetricCardProps) => (
  <Card className="interactive-surface group overflow-hidden hover:border-primary/30">
    <CardHeader className="gap-4 border-none pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {title}
          </p>
          <CardTitle className="text-3xl tabular-nums tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/60 p-3 text-primary motion-safe:transition-[border-color,background-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none group-hover:border-primary/35">
          <Icon className="size-5" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {delta ? <Badge variant={badgeVariantByTone[tone]}>{delta}</Badge> : null}
      </div>
    </CardContent>
  </Card>
);
