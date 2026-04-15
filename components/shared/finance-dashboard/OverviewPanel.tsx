import {
  AlertTriangle,
  ArrowUpRight,
  Landmark,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildDeltaLabel,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatShortMonth,
  formatSignedCurrency,
} from "@/lib/finance-formatters";
import type { DashboardDataset } from "@/types/finance";
import { CashFlowBarChart, SparklineAreaChart } from "./charts";

const OverviewPanel = ({ data }: { data: DashboardDataset }) => {
  const { metrics, monthLabels, balanceSeries, cashFlowSeries, months } = data;
  const runwayLabel = Number.isFinite(metrics.runwayMonths)
    ? `${metrics.runwayMonths.toFixed(1)} mo`
    : "Healthy";

  const kpis = [
    {
      label: "Current balance",
      value: formatCurrency(metrics.latest.endingBalance),
      note: `${metrics.latest.label} close`,
      delta: buildDeltaLabel(
        metrics.latest.endingBalance,
        metrics.previous?.endingBalance ?? null,
      ),
      tone:
        metrics.latest.endingBalance < metrics.fundraiseAlert
          ? "text-amber-300"
          : "text-emerald-300",
    },
    {
      label: "Q1 revenue",
      value: formatCurrency(metrics.totalRevenue),
      note: "Total inflows",
      delta: buildDeltaLabel(
        metrics.latest.totalRevenue,
        metrics.previous?.totalRevenue ?? null,
      ),
      tone: "text-emerald-300",
    },
    {
      label: "Q1 expenses",
      value: formatCurrency(metrics.totalExpenses),
      note: "Total outflows",
      delta: buildDeltaLabel(
        metrics.latest.totalExpenses,
        metrics.previous?.totalExpenses ?? null,
      ),
      tone: "text-rose-300",
    },
    {
      label: "Net cash flow",
      value: formatSignedCurrency(metrics.netCashFlow),
      note: "Quarter to date",
      delta: buildDeltaLabel(
        metrics.latest.netCashFlow,
        metrics.previous?.netCashFlow ?? null,
      ),
      tone:
        metrics.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300",
    },
    {
      label: "Cash runway",
      value: runwayLabel,
      note: `Avg burn ${formatCompactCurrency(metrics.averageBurn)}/mo`,
      delta: `${formatCurrency(metrics.fundraiseAlert)} alert floor`,
      tone:
        metrics.runwayMonths < 3 ? "text-rose-300" : "text-sky-300",
    },
  ];

  const insights = [
    {
      title: "Cash runway alert",
      description: `Average burn is ${formatCurrency(metrics.averageBurn)} per month. The current 3-month fundraise trigger is ${formatCurrency(metrics.fundraiseAlert)}.`,
      icon: Wallet,
      tone:
        metrics.runwayMonths < 3
          ? "border-rose-500/30 bg-rose-500/10"
          : "border-amber-400/30 bg-amber-400/10",
    },
    {
      title: "Revenue concentration risk",
      description: `Affiliate revenue contributed ${formatPercent(metrics.concentrationShare)} of Q1 inflows, with monthly breaches in ${metrics.concentrationBreaches.join(", ") || "no months"}.`,
      icon: ShieldAlert,
      tone: "border-amber-400/30 bg-amber-400/10",
    },
    {
      title: "Payroll pressure",
      description: `${metrics.worstPayrollMonth.label} posted the highest payroll ratio at ${formatPercent(metrics.worstPayrollMonth.payrollRatio)} of revenue.`,
      icon: TrendingDown,
      tone: "border-rose-500/30 bg-rose-500/10",
    },
    {
      title: "Compliance tracking",
      description: `Tax remittances totaled ${formatCurrency(metrics.totalTax)} across the quarter, with ${metrics.latest.taxPaymentCount} payments recorded in ${formatShortMonth(metrics.latest.label)}.`,
      icon: Landmark,
      tone: "border-sky-400/30 bg-sky-400/10",
    },
  ];

  const actionItems = [
    `Treat ${formatCurrency(metrics.fundraiseAlert)} as the minimum funding threshold and start Q2 capital planning before runway compresses further.`,
    `Diversify beyond Involve Asia, which represented ${formatPercent(metrics.concentrationShare)} of quarter revenue and dominated ${metrics.concentrationBreaches.join(", ")}.`,
    `Put reimbursable spending and cashback on monthly caps to protect cash until revenue breadth improves.`,
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border border-border/70 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-primary/25 text-primary">
            {monthLabels.join(" • ")}
          </Badge>
          <CardTitle className="text-2xl">Q1 2026 CFO dashboard</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            A finance operating view for {data.entityName}, built from the
            classified Krungthai statement activity across January, February,
            and March 2026.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:flex-wrap">
          <Badge variant="secondary" className="w-fit">
            {data.accountLabel}
          </Badge>
          <Badge variant="secondary" className="w-fit">
            {data.transactions.length} classified transactions
          </Badge>
          <Badge variant="secondary" className="w-fit">
            Current cash {formatCurrency(metrics.latest.endingBalance)}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <Card
            key={item.label}
            className="border border-border/70 bg-card/80 backdrop-blur-xl"
          >
            <CardHeader className="gap-2">
              <CardDescription className="text-xs uppercase tracking-[0.24em]">
                {item.label}
              </CardDescription>
              <CardTitle className={`text-2xl ${item.tone}`}>{item.value}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{item.note}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpRight className="size-3.5 text-primary" />
                <span>{item.delta}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Balance trend</CardTitle>
            <CardDescription>
              Running balance from the first January posting to the March close.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SparklineAreaChart points={balanceSeries} />
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Monthly cash flow</CardTitle>
            <CardDescription>
              Revenue versus expense load by month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowBarChart points={cashFlowSeries} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`border ${item.tone} bg-card/85 backdrop-blur-xl`}
            >
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-white/10 bg-background/60 p-2">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-primary/25 text-primary">
            {formatPercent(metrics.concentrationShare)} of Q1 revenue
          </Badge>
          <CardTitle>Revenue concentration and CFO actions</CardTitle>
          <CardDescription>
            Affiliate revenue remains the primary operating engine, so the cash
            plan needs both diversification and tighter expense governance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 sm:grid-cols-3">
            {months.map((month) => (
              <div
                key={month.label}
                className="rounded-2xl border border-border/70 bg-background/50 p-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {month.label}
                </p>
                <p className="mt-3 text-xl font-semibold text-primary">
                  {formatCurrency(month.affiliateRevenue)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatPercent(month.concentrationShare)} of month revenue
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            {actionItems.map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-border/70 bg-background/50 p-4"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
                  <AlertTriangle className="size-3.5" />
                  Action {index + 1}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPanel;
