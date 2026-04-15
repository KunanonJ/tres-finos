"use client";

import type { ReactNode } from "react";

import type { DashboardTab } from "@/lib/dashboardUrlState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

const TAB_ITEMS: { value: DashboardTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "monthly-pnl", label: "Monthly P&L" },
  { value: "transactions", label: "Transactions" },
  { value: "categories", label: "Categories" },
];

interface DashboardTabsProps {
  value: DashboardTab;
  onValueChange: (value: DashboardTab) => void;
  overview: ReactNode;
  monthlyPnl: ReactNode;
  transactions: ReactNode;
  categories: ReactNode;
}

export const DashboardTabs = ({
  categories,
  monthlyPnl,
  onValueChange,
  overview,
  transactions,
  value,
}: DashboardTabsProps) => (
  <Tabs className="w-full" value={value} onValueChange={(next) => onValueChange(next as DashboardTab)}>
    <div className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="dashboard-section-select">
        Dashboard section
      </label>
      <select
        id="dashboard-section-select"
        className={cn(
          "md:hidden",
          "w-full rounded-[1.25rem] border border-border/70 bg-card/80 px-4 py-3 text-sm font-medium text-foreground shadow-sm",
          "motion-safe:transition-[border-color,background-color,box-shadow,color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        value={value}
        onChange={(event) => onValueChange(event.target.value as DashboardTab)}
      >
        {TAB_ITEMS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <TabsList className="hidden w-full flex-wrap md:inline-flex">
        {TAB_ITEMS.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
    <TabsContent value="overview">{overview}</TabsContent>
    <TabsContent value="monthly-pnl">{monthlyPnl}</TabsContent>
    <TabsContent value="transactions">{transactions}</TabsContent>
    <TabsContent value="categories">{categories}</TabsContent>
  </Tabs>
);
