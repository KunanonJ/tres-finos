import type { MonthSummary } from "@/types/dashboard";

interface RevenueExpenseChartProps {
  months: MonthSummary[];
  onSelectMonth?: (monthName: string) => void;
  selectedMonth: string;
}

const chartHeight = 160;
const columnWidth = 40;
const barWidth = 14;
const barGap = 4;
const bottomLabelSpace = 28;

export const RevenueExpenseChart = ({
  months,
  onSelectMonth,
  selectedMonth,
}: RevenueExpenseChartProps) => {
  const maxValue = Math.max(
    1,
    ...months.flatMap((month) => [month.totalRevenue, month.totalExpenses]),
  );
  const plotTop = 8;
  const plotBottom = chartHeight - bottomLabelSpace;
  const plotHeight = plotBottom - plotTop;
  const viewWidth = Math.max(months.length * columnWidth, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[var(--color-finance-positive)]" aria-hidden />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[var(--color-finance-critical)]" aria-hidden />
          Expenses
        </span>
      </div>
      <svg
        viewBox={`0 0 ${viewWidth} ${chartHeight}`}
        className="h-44 w-full overflow-visible text-muted-foreground"
        role="img"
        aria-label="Revenue and expenses by month"
      >
        {months.map((month, index) => {
          const revenueH = (month.totalRevenue / maxValue) * plotHeight;
          const expenseH = (month.totalExpenses / maxValue) * plotHeight;
          const baseX = index * columnWidth;
          const revX = baseX + barGap;
          const expX = baseX + barGap + barWidth + 2;
          const isSelected = selectedMonth !== "all" && selectedMonth === month.name;

          return (
            <g key={month.name}>
              <rect
                x={baseX + 2}
                y={plotTop}
                width={columnWidth - 4}
                height={plotHeight}
                rx={6}
                className={
                  isSelected
                    ? "motion-safe:transition-[fill,stroke] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none fill-primary/15 stroke-primary/40 [stroke-width:1px]"
                    : "motion-safe:transition-[fill,stroke] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none fill-transparent stroke-border/40 [stroke-width:1px]"
                }
                pointerEvents="none"
              />
              <g
                role="button"
                tabIndex={0}
                aria-label={`${month.name}: revenue ${String(month.totalRevenue)}, expenses ${String(month.totalExpenses)}. Select to set period scope.`}
                className="cursor-pointer outline-none motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:opacity-95 focus-visible:[outline:2px_solid_var(--ring)] focus-visible:[outline-offset:2px]"
                onClick={() => onSelectMonth?.(month.name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectMonth?.(month.name);
                  }
                }}
              >
                <rect
                  x={revX}
                  y={plotBottom - revenueH}
                  width={barWidth}
                  height={Math.max(revenueH, 0)}
                  rx={3}
                  className="fill-[var(--color-finance-positive)] opacity-90 motion-safe:transition-[opacity,fill] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:opacity-100"
                />
                <rect
                  x={expX}
                  y={plotBottom - expenseH}
                  width={barWidth}
                  height={Math.max(expenseH, 0)}
                  rx={3}
                  className="fill-[var(--color-finance-critical)] opacity-90 motion-safe:transition-[opacity,fill] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:opacity-100"
                />
              </g>
              <text
                x={baseX + columnWidth / 2}
                y={chartHeight - 8}
                textAnchor="middle"
                pointerEvents="none"
                className="fill-current text-[9px] font-medium uppercase tracking-[0.14em] sm:text-[10px]"
              >
                {month.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        Click a month&apos;s bars to set the period scope, or use the chips above.
      </p>
    </div>
  );
};
