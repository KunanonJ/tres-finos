import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildTrendLabel,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/finance-formatters";
import type { MonthlySummary } from "@/types/finance";

interface MetricRow {
  label: string;
  values: number[];
  section?: never;
  format: "currency" | "signed" | "percent";
  trendDirection: "up" | "down";
}

interface SectionRow {
  section: string;
  label?: never;
  values?: never;
  format?: never;
  trendDirection?: never;
}

type TableRowConfig = MetricRow | SectionRow;

const MonthlyTable = ({ months }: { months: MonthlySummary[] }) => {
  const rows: TableRowConfig[] = [
    { section: "Balances" },
    {
      label: "Opening balance",
      values: months.map((month) => month.beginningBalance),
      format: "currency",
      trendDirection: "up",
    },
    {
      label: "Closing balance",
      values: months.map((month) => month.endingBalance),
      format: "currency",
      trendDirection: "up",
    },
    { section: "Revenue" },
    {
      label: "Total revenue",
      values: months.map((month) => month.totalRevenue),
      format: "currency",
      trendDirection: "up",
    },
    {
      label: "Affiliate revenue",
      values: months.map((month) => month.affiliateRevenue),
      format: "currency",
      trendDirection: "up",
    },
    {
      label: "International revenue",
      values: months.map((month) => month.internationalRevenue),
      format: "currency",
      trendDirection: "up",
    },
    {
      label: "Internal transfer in",
      values: months.map((month) => month.internalTransferIn),
      format: "currency",
      trendDirection: "up",
    },
    { section: "Expenses" },
    {
      label: "Total expenses",
      values: months.map((month) => month.totalExpenses),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Payroll – core staff",
      values: months.map((month) => month.payrollCore),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Payroll – management",
      values: months.map((month) => month.payrollManagement),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Operations & reimbursable",
      values: months.map((month) => month.operationsSpend),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Professional services",
      values: months.map((month) => month.professionalServices),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Tax & government",
      values: months.map((month) => month.taxPaid),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Bank fees",
      values: months.map((month) => month.bankFees),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Affiliate cashback out",
      values: months.map((month) => month.cashback),
      format: "currency",
      trendDirection: "down",
    },
    { section: "Cash health" },
    {
      label: "Net cash flow",
      values: months.map((month) => month.netCashFlow),
      format: "signed",
      trendDirection: "up",
    },
    {
      label: "Burn rate",
      values: months.map((month) => month.burnRate),
      format: "currency",
      trendDirection: "down",
    },
    {
      label: "Payroll / revenue",
      values: months.map((month) => month.payrollRatio),
      format: "percent",
      trendDirection: "down",
    },
    {
      label: "Affiliate share of revenue",
      values: months.map((month) => month.concentrationShare),
      format: "percent",
      trendDirection: "down",
    },
  ];

  const formatValue = (row: MetricRow, value: number): string => {
    switch (row.format) {
      case "signed":
        return formatSignedCurrency(value);
      case "percent":
        return formatPercent(value);
      case "currency":
      default:
        return value === 0 ? "—" : formatCurrency(value);
    }
  };

  return (
    <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Monthly P&amp;L bridge</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monthly operating summary from the classified bank ledger.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/25 text-primary">
          {months.length} months
        </Badge>
      </CardHeader>
      <CardContent>
        <Table className="[&_td]:align-top [&_th]:align-top">
          <TableHeader>
            <TableRow className="border-border/70">
              <TableHead className="w-56">Metric</TableHead>
              {months.map((month) => (
                <TableHead key={month.label}>{month.label}</TableHead>
              ))}
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              if ("section" in row) {
                return (
                  <TableRow key={row.section} className="hover:bg-transparent">
                    <TableCell
                      colSpan={months.length + 2}
                      className="bg-background/50 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      {row.section}
                    </TableCell>
                  </TableRow>
                );
              }

              const trend = buildTrendLabel(
                row.values[0] ?? 0,
                row.values[row.values.length - 1] ?? 0,
                row.trendDirection,
              );

              return (
                <TableRow key={row.label} className="border-border/60">
                  <TableCell className="font-medium text-foreground">
                    {row.label}
                  </TableCell>
                  {row.values.map((value, index) => (
                    <TableCell key={`${row.label}-${months[index]?.label}`}>
                      {formatValue(row, value)}
                    </TableCell>
                  ))}
                  <TableCell className="text-muted-foreground">{trend}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonthlyTable;
