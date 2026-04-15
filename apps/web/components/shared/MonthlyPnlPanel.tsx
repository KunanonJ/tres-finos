import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { MonthSummary, MonthlyCategoryRow } from "@/types/dashboard";

interface MonthlyPnlPanelProps {
  months: MonthSummary[];
  rows: MonthlyCategoryRow[];
  scopeMonth: string;
  onCellNavigate: (payload: {
    month: string;
    category?: string;
    direction?: "IN" | "OUT";
  }) => void;
}

const getCellTone = (direction: "IN" | "OUT") =>
  direction === "IN" ? "text-finance-positive" : "text-finance-critical";

export const MonthlyPnlPanel = ({
  months,
  onCellNavigate,
  rows,
  scopeMonth,
}: MonthlyPnlPanelProps) => {
  const incomeRows = rows.filter((row) => row.direction === "IN");
  const expenseRows = rows.filter((row) => row.direction === "OUT");

  const renderAmountCell = (
    month: MonthSummary,
    row: MonthlyCategoryRow,
    direction: "IN" | "OUT",
  ) => {
    const amount = row.totals[month.name];
    const hasAmount = amount > 0;
    const isFocused = scopeMonth !== "all" && scopeMonth === month.name;

    if (!hasAmount) {
      return (
        <TableCell
          key={month.name}
          className={cn(getCellTone(direction), isFocused && "bg-primary/10")}
        >
          —
        </TableCell>
      );
    }

    return (
      <TableCell
        key={month.name}
        className={cn(
          getCellTone(direction),
          isFocused && "bg-primary/15 ring-1 ring-primary/25",
          "p-0",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex h-full w-full items-center justify-start px-4 py-3 text-left motion-safe:transition-[background-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
            "hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
          onClick={() =>
            onCellNavigate({ month: month.name, category: row.category, direction: row.direction })
          }
        >
          <span className="tabular-nums">{formatCurrency(amount)}</span>
        </button>
      </TableCell>
    );
  };

  return (
    <Card>
      <CardHeader>
        <Badge variant="info">Monthly P&amp;L</Badge>
        <CardTitle>Category-level profit and loss</CardTitle>
        <CardDescription>
          Tap an amount to open the transaction list for that month and category. The scoped month
          column is highlighted when you use the period chips.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table stickyHeader>
          <TableHeader sticky>
            <TableRow>
              <TableHead className="min-w-[14rem]">Category</TableHead>
              {months.map((month) => (
                <TableHead
                  key={month.name}
                  className={cn(
                    "min-w-[10rem] tabular-nums",
                    scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10 text-primary",
                  )}
                >
                  {month.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-background/50">
              <TableCell className="font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Income
              </TableCell>
              {months.map((month) => (
                <TableCell
                  key={month.name}
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10",
                  )}
                >
                  {formatCurrency(month.totalRevenue)}
                </TableCell>
              ))}
            </TableRow>
            {incomeRows.map((row) => (
              <TableRow key={`${row.direction}-${row.category}`}>
                <TableCell className="font-medium">{row.category}</TableCell>
                {months.map((month) => renderAmountCell(month, row, "IN"))}
              </TableRow>
            ))}
            <TableRow className="bg-background/50">
              <TableCell className="font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Expenses
              </TableCell>
              {months.map((month) => (
                <TableCell
                  key={month.name}
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10",
                  )}
                >
                  {formatCurrency(month.totalExpenses)}
                </TableCell>
              ))}
            </TableRow>
            {expenseRows.map((row) => (
              <TableRow key={`${row.direction}-${row.category}`}>
                <TableCell className="font-medium">{row.category}</TableCell>
                {months.map((month) => renderAmountCell(month, row, "OUT"))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Net cash flow</TableCell>
              {months.map((month) => (
                <TableCell
                  key={month.name}
                  className={cn(
                    scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10",
                    month.netCashFlow >= 0 ? "text-finance-positive" : "text-finance-critical",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left tabular-nums motion-safe:transition-[color,opacity,text-decoration-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                    onClick={() => onCellNavigate({ month: month.name })}
                  >
                    {formatSignedCurrency(month.netCashFlow)}
                  </button>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold">Ending balance</TableCell>
              {months.map((month) => (
                <TableCell
                  key={month.name}
                  className={cn(
                    "tabular-nums",
                    scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10",
                  )}
                >
                  {formatCurrency(month.endingBalance)}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};
