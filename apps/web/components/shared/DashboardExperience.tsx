"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Calendar, Landmark, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";
import { useMergedDashboardData } from "@/hooks/useMergedDashboardData";
import {
  loadBankStatementsSnapshot,
  parseBankStatementsSnapshot,
  subscribeBankStatements,
} from "@/lib/bankStatementStorage";
import type { DashboardData } from "@/types/dashboard";
import {
  buildDashboardUrl,
  directionToTransaction,
  parseDashboardSearchParams,
  transactionToDirection,
  type DashboardTab,
} from "@/lib/dashboardUrlState";

import { BankStatementManager } from "@/components/shared/BankStatementManager";
import { CategoriesPanel } from "@/components/shared/CategoriesPanel";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { DashboardDataTools } from "@/components/shared/DashboardDataTools";
import { DashboardOnboarding } from "@/components/shared/DashboardOnboarding";
import { DashboardScopeBar } from "@/components/shared/DashboardScopeBar";
import { DashboardTabs } from "@/components/shared/DashboardTabs";
import { MonthlyPnlPanel } from "@/components/shared/MonthlyPnlPanel";
import { OverviewPanel } from "@/components/shared/OverviewPanel";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { TransactionsPanel } from "@/components/shared/TransactionsPanel";

interface DashboardExperienceProps {
  data: DashboardData;
}

export const DashboardExperience = ({ data: serverData }: DashboardExperienceProps) => {
  const data = useMergedDashboardData(serverData);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [commandOpen, setCommandOpen] = useState(false);

  const storageSnapshot = useSyncExternalStore(
    subscribeBankStatements,
    loadBankStatementsSnapshot,
    () => "{}",
  );

  const monthNames = useMemo(() => data.months.map((month) => month.name), [data.months]);

  const bankStatementMonthNames = useMemo(() => {
    const uploads = parseBankStatementsSnapshot(storageSnapshot);
    const merged = new Set([
      ...serverData.months.map((month) => month.name),
      ...Object.keys(uploads),
    ]);
    return [...merged].sort((left, right) => left.localeCompare(right));
  }, [serverData.months, storageSnapshot]);

  const urlState = useMemo(() => parseDashboardSearchParams(searchParams), [searchParams]);

  const scopeMonth = useMemo(() => {
    if (urlState.month === "all") {
      return "all";
    }

    return monthNames.includes(urlState.month) ? urlState.month : "all";
  }, [monthNames, urlState.month]);

  const compareEffective = useMemo(() => {
    if (scopeMonth === "all" || !urlState.compare.trim()) {
      return "";
    }

    return monthNames.includes(urlState.compare) && urlState.compare !== scopeMonth
      ? urlState.compare
      : "";
  }, [monthNames, scopeMonth, urlState.compare]);

  const replaceUrl = useCallback(
    (updates: Partial<typeof urlState>) => {
      const nextHref = buildDashboardUrl({
        pathname,
        current: searchParams,
        updates: { ...urlState, ...updates },
      });
      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParams, urlState],
  );

  const setTab = useCallback(
    (tab: DashboardTab) => {
      replaceUrl({ tab });
    },
    [replaceUrl],
  );

  const setScopeMonth = useCallback(
    (month: string) => {
      const nextMonth = month === "all" ? "all" : month;
      const updates: Partial<typeof urlState> = {
        month: nextMonth,
        ...(nextMonth === "all" ? { compare: "" } : {}),
      };

      if (nextMonth !== "all" && urlState.compare === nextMonth) {
        updates.compare = "";
      }

      replaceUrl(updates);
    },
    [replaceUrl, urlState.compare],
  );

  const applyUrlUpdates = useCallback(
    (updates: Partial<typeof urlState>) => {
      replaceUrl(updates);
    },
    [replaceUrl],
  );

  const viewTransactions = useCallback(
    (opts: { month?: string; category?: string; direction?: "IN" | "OUT" }) => {
      const updates: Partial<typeof urlState> = { tab: "transactions" };

      if (opts.month !== undefined) {
        updates.month = opts.month;
      }

      if (opts.category !== undefined) {
        updates.cat = opts.category;
      } else {
        updates.cat = "";
      }

      if (opts.direction !== undefined) {
        updates.dir = opts.direction === "IN" ? "in" : "out";
      } else {
        updates.dir = "all";
      }

      replaceUrl(updates);
    },
    [replaceUrl],
  );

  const latestMonth = data.months.length > 0 ? data.months[data.months.length - 1] : undefined;
  const periodLabel =
    data.months.length > 0 && latestMonth
      ? `${data.months[0].shortLabel} – ${latestMonth.shortLabel} · Q1 2026`
      : "No data";

  return (
    <div className="dashboard-shell">
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        monthNames={monthNames}
        scopeMonth={scopeMonth}
        onApply={applyUrlUpdates}
      />
      <header className="no-print interactive-surface-slow flex flex-col gap-4 rounded-[1.75rem] border border-border/80 bg-card/80 px-5 py-5 shadow-[0_24px_80px_rgba(3,6,18,0.45)] backdrop-blur hover:border-primary/20 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="interactive-surface rounded-2xl border border-primary/35 bg-primary/15 p-3 text-primary hover:border-primary/50">
              <Landmark className="size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
                Tres Finos CFO Console
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0" aria-hidden />
                  {periodLabel}
                </span>
                <span className="hidden text-border sm:inline" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Ledger synced · {data.transactions.length} movements
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-4" aria-hidden />
              <span className="hidden sm:inline">Search &amp; jump</span>
              <kbd className="hidden rounded border border-border px-1.5 font-mono text-[0.65rem] sm:inline">
                ⌘K
              </kbd>
            </Button>
            <ThemeToggle />
            <div className="interactive-surface flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border/70 bg-background/40 px-4 py-3 hover:border-primary/25 lg:justify-end">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Latest close
              </span>
              <Badge variant="outline" className="text-sm tabular-nums">
                {latestMonth ? formatCurrency(latestMonth.endingBalance) : "—"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DashboardDataTools
          transactions={data.transactions}
          exportFilenameBase="tres-finos-transactions"
          activeMonth={scopeMonth}
          direction={urlState.dir}
          searchQuery={urlState.q}
          category={urlState.cat}
        />
      </div>

      <DashboardOnboarding />

      <DashboardScopeBar
        monthLabels={monthNames}
        scopeMonth={scopeMonth}
        onScopeMonthChange={setScopeMonth}
        compareMonth={compareEffective}
        onCompareMonthChange={(month) => replaceUrl({ compare: month })}
      />

      <BankStatementManager monthNames={bankStatementMonthNames} statementsSnapshot={storageSnapshot} />

      <div id="dashboard-main" className="print-main" tabIndex={-1}>
        <div className="mb-6 hidden print:block">
          <h1 className="font-heading text-xl font-semibold">Tres Finos CFO Console</h1>
          <p className="text-sm text-muted-foreground">
            {periodLabel} · {data.transactions.length} movements
          </p>
        </div>
        <DashboardTabs
          value={urlState.tab}
          onValueChange={setTab}
          overview={
            <OverviewPanel
              data={data}
              scopeMonth={scopeMonth}
              compareToMonth={compareEffective}
              onSetScopeMonth={setScopeMonth}
              onViewTransactions={viewTransactions}
            />
          }
          monthlyPnl={
            <MonthlyPnlPanel
              months={data.months}
              rows={data.monthlyPnlRows}
              scopeMonth={scopeMonth}
              onCellNavigate={viewTransactions}
            />
          }
          transactions={
            <TransactionsPanel
              months={monthNames}
              transactions={data.transactions}
              activeMonth={scopeMonth}
              activeDirection={directionToTransaction(urlState.dir)}
              searchValue={urlState.q}
              categoryFilter={urlState.cat}
              onMonthChange={(next) => replaceUrl({ month: next })}
              onDirectionChange={(next) => replaceUrl({ dir: transactionToDirection(next) })}
              onSearchChange={(q) => replaceUrl({ q })}
              onClearCategory={() => replaceUrl({ cat: "" })}
            />
          }
          categories={
            <CategoriesPanel
              data={data}
              scopeMonth={scopeMonth}
              onCategoryNavigate={(category, direction) =>
                viewTransactions({
                  category,
                  direction,
                  ...(scopeMonth !== "all" ? { month: scopeMonth } : {}),
                })
              }
            />
          }
        />
      </div>
    </div>
  );
};
