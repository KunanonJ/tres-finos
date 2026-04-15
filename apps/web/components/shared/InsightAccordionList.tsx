"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { DashboardInsight, InsightTone } from "@/types/dashboard";

const badgeVariantByTone: Record<InsightTone, "positive" | "warning" | "critical" | "info"> = {
  positive: "positive",
  warning: "warning",
  critical: "critical",
  info: "info",
};

interface InsightAccordionListProps {
  insights: DashboardInsight[];
}

export const InsightAccordionList = ({ insights }: InsightAccordionListProps) => (
  <div className="flex flex-col gap-2">
    {insights.map((insight) => (
      <details
        key={insight.title}
        className="group rounded-[1.25rem] border border-border/70 bg-background/35 motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none open:border-primary/35 open:bg-background/45"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-[1.25rem] px-4 py-3 motion-safe:transition-[background-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none marker:hidden hover:bg-background/25 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-heading text-base font-semibold leading-snug">{insight.title}</span>
            <span className="text-sm text-muted-foreground line-clamp-2 group-open:hidden">
              {insight.body}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={badgeVariantByTone[insight.tone]}>{insight.tone}</Badge>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none group-open:rotate-180"
              aria-hidden
            />
          </div>
        </summary>
        <div className="border-t border-border/60 px-4 pb-4 pt-1">
          <p className="text-sm leading-6 text-muted-foreground">{insight.body}</p>
        </div>
      </details>
    ))}
  </div>
);
