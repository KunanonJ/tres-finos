"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DashboardDataset } from "@/types/finance";
import CategoriesPanel from "./CategoriesPanel";
import MonthlyTable from "./MonthlyTable";
import OverviewPanel from "./OverviewPanel";
import TransactionsPanel from "./TransactionsPanel";

const FinanceDashboard = ({ data }: { data: DashboardDataset }) => {
  const exportTransactions = () => {
    const header = [
      "Month",
      "Date",
      "Time",
      "Transaction Code",
      "Description",
      "Counterparty",
      "Amount (THB)",
      "Direction",
      "Category",
      "Running Balance",
    ];

    const rows = data.transactions.map((transaction) => [
      transaction.month,
      transaction.date,
      transaction.time,
      transaction.code,
      `"${transaction.description.replaceAll('"', '""')}"`,
      `"${transaction.counterparty.replaceAll('"', '""')}"`,
      transaction.amount.toFixed(2),
      transaction.direction,
      transaction.category,
      transaction.balance.toFixed(2),
    ]);

    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gogocash-q1-2026-dashboard-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-card/75 px-6 py-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-lg font-semibold text-primary">
                GG
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  GoGoCash Finance
                </p>
                <h1 className="text-2xl font-semibold text-foreground">
                  Dashboard foundation
                </h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This Next.js build is now the working version of the finance
              dashboard for the project, using the Q1 2026 classified CSV as the
              single source of truth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-primary/25 text-primary">
              {data.accountLabel}
            </Badge>
            <Button onClick={exportTransactions}>
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList variant="line" className="w-full justify-start lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monthly">Monthly P&amp;L</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            {data.monthLabels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <TabsContent value="overview">
          <OverviewPanel data={data} />
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyTable months={data.months} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsPanel
            monthLabels={data.monthLabels}
            transactions={data.transactions}
          />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesPanel
            expenseCategoryTotals={data.expenseCategoryTotals}
            incomeCategoryTotals={data.incomeCategoryTotals}
            categoryTrend={data.categoryTrend}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceDashboard;
