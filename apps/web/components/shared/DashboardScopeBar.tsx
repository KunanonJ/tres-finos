"use client";

import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface DashboardScopeBarProps {
  monthLabels: string[];
  scopeMonth: string;
  onScopeMonthChange: (month: string) => void;
  compareMonth: string;
  onCompareMonthChange: (month: string) => void;
}

export const DashboardScopeBar = ({
  compareMonth,
  monthLabels,
  onCompareMonthChange,
  onScopeMonthChange,
  scopeMonth,
}: DashboardScopeBarProps) => (
  <div className="interactive-surface-slow flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-card/60 p-4 backdrop-blur hover:border-primary/25">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarRange className="size-4 shrink-0 text-primary" aria-hidden />
        <span>Period scope</span>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter dashboard by month"
      >
        <Button
          size="sm"
          variant={scopeMonth === "all" ? "secondary" : "outline"}
          onClick={() => onScopeMonthChange("all")}
        >
          Full period
        </Button>
        {monthLabels.map((label) => (
          <Button
            key={label}
            size="sm"
            variant={scopeMonth === label ? "secondary" : "outline"}
            onClick={() => onScopeMonthChange(label)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
    {scopeMonth !== "all" ? (
      <div className="flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Compare <span className="font-medium text-foreground">{scopeMonth}</span> to
        </span>
        <select
          className="h-9 w-full max-w-xs rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground sm:w-auto"
          aria-label="Select month to compare against the scoped month"
          value={compareMonth}
          onChange={(event) => onCompareMonthChange(event.target.value)}
        >
          <option value="">No comparison</option>
          {monthLabels
            .filter((label) => label !== scopeMonth)
            .map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
        </select>
      </div>
    ) : null}
  </div>
);
