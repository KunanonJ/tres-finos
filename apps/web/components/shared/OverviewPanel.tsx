import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpRight,
  BanknoteArrowDown,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/formatters";
import type { DashboardData, MonthSummary } from "@/types/dashboard";

import { InsightAccordionList } from "@/components/shared/InsightAccordionList";
import { MetricCard } from "@/components/shared/MetricCard";
import { RevenueExpenseChart } from "@/components/shared/RevenueExpenseChart";

interface OverviewPanelProps {
  data: DashboardData;
  scopeMonth: string;
  /** Effective comparison month (empty when none or invalid). */
  compareToMonth: string;
  onSetScopeMonth: (month: string) => void;
  onViewTransactions: (opts: { month?: string; category?: string; direction?: "IN" | "OUT" }) => void;
}

const getProgressTone = (month: MonthSummary) => {
  if (month.netCashFlow < 0) {
    return "critical";
  }

  if (month.revenueConcentrationShare > 0.7) {
    return "warning";
  }

  return "positive";
};

export const OverviewPanel = ({
  compareToMonth,
  data,
  onSetScopeMonth,
  onViewTransactions,
  scopeMonth,
}: OverviewPanelProps) => {
  const latestMonth = data.months.length > 0 ? data.months[data.months.length - 1] : undefined;
  const scoped =
    scopeMonth === "all"
      ? null
      : (data.months.find((month) => month.name === scopeMonth) ?? null);

  const compareMonthSummary =
    scoped && compareToMonth
      ? (data.months.find((month) => month.name === compareToMonth) ?? null)
      : null;

  const balanceCeiling =
    data.months.length > 0
      ? Math.max(...data.months.map((month) => month.endingBalance), 1)
      : 1;
  const quarterAffiliateRevenue = data.months.reduce(
    (sum, month) => sum + month.affiliateRevenue,
    0,
  );
  const criticalFloor = data.totals.averageMonthlyBurn * 3;
  const preferredFloor = data.totals.averageMonthlyBurn * 6;

  const balanceValue = scoped ? scoped.endingBalance : data.totals.currentBalance;
  const balanceHint = scoped
    ? `${scoped.name} closing cash`
    : latestMonth
      ? `${latestMonth.name} closing cash`
      : "No ledger months loaded";

  const revenueValue = scoped ? scoped.totalRevenue : data.totals.totalRevenue;
  const revenueTitle = scoped ? "Month revenue" : "Quarter revenue";
  const revenueHint = scoped
    ? `Deposits in ${scoped.name}`
    : "Total deposits across loaded months";

  const expenseValue = scoped ? scoped.totalExpenses : data.totals.totalExpenses;
  const expenseTitle = scoped ? "Month expenses" : "Quarter expenses";
  const expenseHint = scoped
    ? `Withdrawals in ${scoped.name}`
    : "Total withdrawals across loaded months";

  const netValue = scoped ? scoped.netCashFlow : data.totals.netCashFlow;
  const netTitle = scoped ? "Net cash (month)" : "Net cash flow";
  const netHint = scoped
    ? `After revenue and expenses in ${scoped.name}`
    : `Average burn ${formatCompactCurrency(data.totals.averageMonthlyBurn)}/month`;

  const revenueTone =
    !scoped &&
    data.totals.latestRevenueChangePct !== null &&
    data.totals.latestRevenueChangePct < 0
      ? "warning"
      : "positive";

  const monthsForTrajectory =
    scopeMonth === "all" ? data.months : data.months.filter((month) => month.name === scopeMonth);

  return (
    <div className="flex flex-col gap-6">
      {scoped ? (
        <div className="rounded-[1.25rem] border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
          Viewing <span className="font-medium text-foreground">{scoped.name}</span> — metrics below
          reflect this month. Charts and runway use the broader ledger context where noted.
        </div>
      ) : null}

      {scoped && compareToMonth ? (
        compareMonthSummary ? (
          <div className="rounded-[1.25rem] border border-border/70 bg-card/50 px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="info">Compare</Badge>
              <p className="font-heading text-base font-semibold">
                {scoped.name} vs {compareMonthSummary.name}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Revenue", scoped.totalRevenue, compareMonthSummary.totalRevenue],
                  ["Expenses", scoped.totalExpenses, compareMonthSummary.totalExpenses],
                  ["Net cash", scoped.netCashFlow, compareMonthSummary.netCashFlow],
                  ["Ending balance", scoped.endingBalance, compareMonthSummary.endingBalance],
                ] as const
              ).map(([label, baseVal, otherVal]) => {
                const delta = baseVal - otherVal;
                return (
                  <div
                    key={label}
                    className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                    <p className="mt-1 font-medium tabular-nums text-foreground">
                      {formatCurrency(baseVal)}
                      <span className="text-muted-foreground"> vs </span>
                      {formatCurrency(otherVal)}
                    </p>
                    <p
                      className={`mt-1 text-xs tabular-nums ${
                        delta >= 0 ? "text-finance-positive" : "text-finance-critical"
                      }`}
                    >
                      Δ {formatSignedCurrency(delta)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            Comparison month <span className="font-medium">{compareToMonth}</span> is not in this ledger.
            Choose another month under Compare in Period scope.
          </div>
        )
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Current balance"
          value={formatCurrency(balanceValue)}
          hint={balanceHint}
          icon={Wallet}
          tone={balanceValue < criticalFloor ? "critical" : "positive"}
        />
        <MetricCard
          title={revenueTitle}
          value={formatCurrency(revenueValue)}
          hint={revenueHint}
          icon={ArrowUpCircle}
          tone={revenueTone}
          delta={
            !scoped && data.totals.latestRevenueChangePct !== null
              ? `${data.totals.latestRevenueChangePct >= 0 ? "+" : "-"}${Math.abs(
                  data.totals.latestRevenueChangePct * 100,
                ).toFixed(1)}% MoM`
              : undefined
          }
        />
        <MetricCard
          title={expenseTitle}
          value={formatCurrency(expenseValue)}
          hint={expenseHint}
          icon={ArrowDownCircle}
          tone="critical"
        />
        <MetricCard
          title={netTitle}
          value={formatSignedCurrency(netValue)}
          hint={netHint}
          icon={BanknoteArrowDown}
          tone={netValue < 0 ? "critical" : "positive"}
        />
        <MetricCard
          title="Runway"
          value={
            data.totals.runwayMonths !== null
              ? `${data.totals.runwayMonths.toFixed(1)} months`
              : "Stable"
          }
          hint={scoped ? "Global projection at current burn" : "At the current burn profile"}
          icon={ShieldAlert}
          tone={
            data.totals.runwayMonths !== null && data.totals.runwayMonths < 3
              ? "critical"
              : data.totals.runwayMonths !== null && data.totals.runwayMonths < 6
                ? "warning"
                : "positive"
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="info">Revenue vs expenses</Badge>
            <CardTitle>Cash activity by month</CardTitle>
            <CardDescription>
              Compare inflows and outflows. Use the chart or period scope chips to focus a month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart
              months={data.months}
              selectedMonth={scopeMonth}
              onSelectMonth={(month) => onSetScopeMonth(month)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="warning">Insights</Badge>
            <CardTitle>What needs attention</CardTitle>
            <CardDescription>
              Expand a card for the full narrative. Titles stay scannable on first glance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InsightAccordionList insights={data.insights} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <Badge variant="info">Balance trajectory</Badge>
            <CardTitle>Monthly liquidity movement</CardTitle>
            <CardDescription>
              Opening balance, ending balance, and net movement for each statement month.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {monthsForTrajectory.map((month) => (
              <div
                key={month.name}
                className="interactive-surface rounded-[1.25rem] border border-border/70 bg-background/35 p-4 hover:border-primary/35"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-heading text-lg font-semibold">{month.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(month.beginningBalance)} opening to{" "}
                      {formatCurrency(month.endingBalance)} closing
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={month.netCashFlow < 0 ? "critical" : "positive"}>
                      {formatSignedCurrency(month.netCashFlow)}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => onViewTransactions({ month: month.name })}
                    >
                      Transactions
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  <progress
                    className="dashboard-progress"
                    data-tone={getProgressTone(month)}
                    max={balanceCeiling}
                    value={month.endingBalance}
                  />
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <span className="tabular-nums">
                      Revenue {formatCurrency(month.totalRevenue)}
                    </span>
                    <span className="tabular-nums">
                      Expenses {formatCurrency(month.totalExpenses)}
                    </span>
                    <span className="tabular-nums">
                      Payroll {formatCurrency(month.payrollTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="positive">Affiliate concentration</Badge>
            <CardTitle>Income mix by month</CardTitle>
            <CardDescription>
              How much of each month&apos;s revenue came from affiliate activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {data.months.map((month) => (
              <div
                key={month.name}
                className="interactive-surface rounded-[1.25rem] border border-border/70 bg-background/35 p-4 hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-base font-semibold">{month.shortLabel}</p>
                  <Badge variant={month.revenueConcentrationShare > 0.7 ? "warning" : "positive"}>
                    {formatPercent(month.revenueConcentrationShare)}
                  </Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatCurrency(month.affiliateRevenue)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  of {formatCurrency(month.totalRevenue)} total revenue
                </p>
                <progress
                  className="dashboard-progress mt-4"
                  data-tone={month.revenueConcentrationShare > 0.7 ? "warning" : "positive"}
                  max={1}
                  value={month.revenueConcentrationShare}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-3 h-8 w-full gap-1"
                  onClick={() =>
                    onViewTransactions({ month: month.name, category: "Affiliate Revenue" })
                  }
                >
                  View affiliate lines
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="rounded-[1.25rem] border border-primary/25 bg-primary/10 p-4 md:col-span-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-heading text-lg font-semibold">Quarter affiliate intake</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(quarterAffiliateRevenue)} of{" "}
                    {formatCurrency(data.totals.totalRevenue)} total inflows
                  </p>
                </div>
                <Badge variant={data.totals.affiliateRevenueShare > 0.7 ? "warning" : "positive"}>
                  {formatPercent(data.totals.affiliateRevenueShare)} concentration
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <Badge variant="critical">Guardrails</Badge>
            <CardTitle>Liquidity thresholds</CardTitle>
            <CardDescription>
              Compare the live cash position against preferred operating floors.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  3-month alert floor
                </p>
                <Badge
                  variant={data.totals.currentBalance < criticalFloor ? "critical" : "positive"}
                  className="tabular-nums"
                >
                  {formatCurrency(criticalFloor)}
                </Badge>
              </div>
              <progress
                className="dashboard-progress mt-4"
                data-tone={data.totals.currentBalance < criticalFloor ? "critical" : "positive"}
                max={Math.max(preferredFloor, data.totals.currentBalance, 1)}
                value={data.totals.currentBalance}
              />
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  6-month preferred floor
                </p>
                <Badge variant="info" className="tabular-nums">
                  {formatCurrency(preferredFloor)}
                </Badge>
              </div>
              <progress
                className="dashboard-progress mt-4"
                data-tone="info"
                max={Math.max(preferredFloor, data.totals.currentBalance, 1)}
                value={data.totals.currentBalance}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recurring expenses
                </p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {latestMonth ? formatCurrency(latestMonth.recurringExpenses) : "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Latest month payroll-heavy burn</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Variable expenses
                </p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {latestMonth ? formatCurrency(latestMonth.variableExpenses) : "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reimbursables, taxes, and partner payouts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
