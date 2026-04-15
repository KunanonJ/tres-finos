import {
  formatCompactCurrency,
  formatCurrency,
  formatShortMonth,
} from "@/lib/finance-formatters";
import type {
  BalancePoint,
  CashFlowPoint,
  CategoryTrendPoint,
  ChartDatum,
} from "@/types/finance";

const createChartPoints = (
  values: number[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
): string[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  return values.map((value, index) => {
    const x =
      padding.left +
      (values.length === 1 ? usableWidth / 2 : (usableWidth / (values.length - 1)) * index);
    const y =
      padding.top + usableHeight - ((value - min) / range) * usableHeight;

    return `${x},${y}`;
  });
};

export const SparklineAreaChart = ({
  points,
}: {
  points: BalancePoint[];
}) => {
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 34, left: 20 };
  const values = points.map((point) => point.value);
  const chartPoints = createChartPoints(values, width, height, padding);
  const areaPoints = [
    `${padding.left},${height - padding.bottom}`,
    ...chartPoints,
    `${width - padding.right},${height - padding.bottom}`,
  ].join(" ");
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-60 w-full"
        role="img"
        aria-label="Balance trend chart"
      >
        <defs>
          <linearGradient id="balance-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 229, 176, 0.35)" />
            <stop offset="100%" stopColor="rgba(0, 229, 176, 0.02)" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="18"
          fill="transparent"
        />
        <polygon points={areaPoints} fill="url(#balance-area)" />
        <polyline
          points={chartPoints.join(" ")}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {chartPoints.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          const isLast = index === chartPoints.length - 1;

          if (!isLast && index % 10 !== 0) {
            return null;
          }

          return (
            <circle
              key={`${points[index]?.label}-${index}`}
              cx={x}
              cy={y}
              r={isLast ? 5 : 3.5}
              fill={isLast ? "var(--chart-2)" : "var(--chart-1)"}
              stroke="rgba(5, 7, 13, 0.8)"
              strokeWidth="2"
            />
          );
        })}
        <text
          x={padding.left}
          y={height - 10}
          fill="var(--muted-foreground)"
          fontSize="11"
        >
          {formatShortMonth(points[0]?.month ?? "")}
        </text>
        <text
          x={width - padding.right}
          y={height - 10}
          textAnchor="end"
          fill="var(--muted-foreground)"
          fontSize="11"
        >
          {formatShortMonth(points[points.length - 1]?.month ?? "")}
        </text>
        <text
          x={padding.left}
          y={18}
          fill="var(--muted-foreground)"
          fontSize="11"
        >
          {formatCompactCurrency(max)}
        </text>
        <text
          x={padding.left}
          y={height - padding.bottom + 14}
          fill="var(--muted-foreground)"
          fontSize="11"
        >
          {formatCompactCurrency(min)}
        </text>
      </svg>
    </div>
  );
};

export const CashFlowBarChart = ({
  points,
}: {
  points: CashFlowPoint[];
}) => {
  const width = 640;
  const height = 240;
  const padding = { top: 18, right: 16, bottom: 40, left: 22 };
  const max = Math.max(...points.flatMap((point) => [point.revenue, point.expenses]), 1);
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const groupWidth = usableWidth / points.length;
  const barWidth = Math.min(34, groupWidth / 3);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-60 w-full"
      role="img"
      aria-label="Monthly cash flow chart"
    >
      {[0, 0.5, 1].map((step) => {
        const y = padding.top + usableHeight - usableHeight * step;
        return (
          <line
            key={step}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}
      {points.map((point, index) => {
        const centerX = padding.left + groupWidth * index + groupWidth / 2;
        const revenueHeight = (point.revenue / max) * usableHeight;
        const expenseHeight = (point.expenses / max) * usableHeight;

        return (
          <g key={point.month}>
            <rect
              x={centerX - barWidth - 4}
              y={padding.top + usableHeight - revenueHeight}
              width={barWidth}
              height={revenueHeight}
              rx="8"
              fill="var(--chart-1)"
            />
            <rect
              x={centerX + 4}
              y={padding.top + usableHeight - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              rx="8"
              fill="var(--chart-5)"
            />
            <text
              x={centerX}
              y={height - 14}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {formatShortMonth(point.month)}
            </text>
          </g>
        );
      })}
      <text x={padding.left} y={16} fill="var(--muted-foreground)" fontSize="11">
        {formatCompactCurrency(max)}
      </text>
      <g transform={`translate(${padding.left}, ${height - 4})`}>
        <rect x="0" y="-10" width="8" height="8" rx="4" fill="var(--chart-1)" />
        <text x="12" y="-3" fill="var(--muted-foreground)" fontSize="11">
          Revenue
        </text>
        <rect x="78" y="-10" width="8" height="8" rx="4" fill="var(--chart-5)" />
        <text x="90" y="-3" fill="var(--muted-foreground)" fontSize="11">
          Expenses
        </text>
      </g>
    </svg>
  );
};

export const DonutChart = ({
  data,
  totalLabel,
}: {
  data: ChartDatum[];
  totalLabel: string;
}) => {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <svg
      viewBox="0 0 180 180"
      className="mx-auto h-56 w-56"
      role="img"
      aria-label="Expense category breakdown"
    >
      <circle
        cx="90"
        cy="90"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="18"
      />
      {data.map((item) => {
        const dash = (item.value / total) * circumference;
        const currentOffset = offset;
        offset += dash;

        return (
          <circle
            key={item.label}
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-currentOffset}
            transform="rotate(-90 90 90)"
          />
        );
      })}
      <text
        x="90"
        y="82"
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize="10"
      >
        {totalLabel}
      </text>
      <text
        x="90"
        y="102"
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize="16"
        fontWeight="600"
      >
        {formatCompactCurrency(total)}
      </text>
    </svg>
  );
};

export const MultiLineTrendChart = ({
  data,
}: {
  data: CategoryTrendPoint[];
}) => {
  const width = 640;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 44, left: 18 };
  const series = [
    { key: "operations", label: "Operations", color: "var(--chart-4)" },
    { key: "payroll", label: "Payroll", color: "var(--chart-5)" },
    { key: "tax", label: "Tax", color: "var(--chart-2)" },
    { key: "cashback", label: "Cashback", color: "var(--chart-3)" },
  ] as const;
  const values = data.flatMap((point) =>
    series.map((item) => point[item.key]),
  );
  const max = Math.max(...values, 1);
  const pointsBySeries = series.map((item) => ({
    ...item,
    points: createChartPoints(
      data.map((point) => point[item.key]),
      width,
      height,
      padding,
    ),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-60 w-full"
      role="img"
      aria-label="Key expense trend chart"
    >
      {[0, 0.5, 1].map((step) => {
        const y =
          padding.top + (height - padding.top - padding.bottom) * (1 - step);

        return (
          <line
            key={step}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}
      {pointsBySeries.map((item) => (
        <g key={item.key}>
          <polyline
            points={item.points.join(" ")}
            fill="none"
            stroke={item.color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={item.key === "cashback" ? "8 6" : undefined}
          />
          {item.points.map((point, index) => {
            const [x, y] = point.split(",").map(Number);

            return (
              <circle
                key={`${item.key}-${data[index]?.month}`}
                cx={x}
                cy={y}
                r="3"
                fill={item.color}
              />
            );
          })}
        </g>
      ))}
      {data.map((point, index) => {
        const x =
          padding.left +
          ((width - padding.left - padding.right) / Math.max(data.length - 1, 1)) *
            index;

        return (
          <text
            key={point.month}
            x={x}
            y={height - 18}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
          >
            {formatShortMonth(point.month)}
          </text>
        );
      })}
      <text x={padding.left} y={16} fill="var(--muted-foreground)" fontSize="11">
        {formatCurrency(max)}
      </text>
    </svg>
  );
};
