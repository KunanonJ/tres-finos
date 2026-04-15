import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CategoryTotal, DashboardData, TransactionDirection } from "@/types/dashboard";

interface CategoriesPanelProps {
  data: DashboardData;
  scopeMonth: string;
  onCategoryNavigate: (category: string, direction: TransactionDirection) => void;
}

const toneByDirection = {
  IN: "positive",
  OUT: "critical",
} as const;

const toneByDirectionText = {
  IN: "text-finance-positive",
  OUT: "text-finance-critical",
} as const;

const renderCategoryList = (
  entries: CategoryTotal[],
  onCategoryNavigate: (category: string, direction: TransactionDirection) => void,
) => (
  <div className="flex flex-col gap-4">
    {entries.map((entry) => (
      <div
        key={`${entry.direction}-${entry.category}`}
        className="interactive-surface rounded-[1.25rem] border border-border/70 bg-background/35 p-4 hover:border-primary/30"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold">{entry.category}</p>
            <p className="text-sm text-muted-foreground">
              {formatPercent(entry.share)} of direction total
            </p>
          </div>
          <Badge variant={toneByDirection[entry.direction]}>{entry.direction}</Badge>
        </div>
        <p
          className={`mt-3 text-xl font-semibold tabular-nums ${toneByDirectionText[entry.direction]}`}
        >
          {formatCurrency(entry.amount)}
        </p>
        <progress
          className="dashboard-progress mt-4"
          data-tone={entry.direction === "IN" ? "positive" : "critical"}
          max={1}
          value={entry.share}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-3 h-8 w-full gap-1"
          onClick={() => onCategoryNavigate(entry.category, entry.direction)}
        >
          View transactions
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    ))}
  </div>
);

export const CategoriesPanel = ({
  data,
  onCategoryNavigate,
  scopeMonth,
}: CategoriesPanelProps) => {
  const focusRows = data.monthlyPnlRows.filter((row) =>
    [
      "Affiliate Revenue",
      "Payroll – Core Staff",
      "Payroll – Management",
      "Operations & Reimbursable",
      "Affiliate Cashback OUT",
      "Tax & Government",
    ].includes(row.category),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="critical">Expense mix</Badge>
            <CardTitle>Where the money is going</CardTitle>
            <CardDescription>
              Top expense categories across the loaded quarter. Jump into the ledger from any card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderCategoryList(data.topExpenseCategories.slice(0, 6), onCategoryNavigate)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="positive">Income mix</Badge>
            <CardTitle>Where cash comes from</CardTitle>
            <CardDescription>
              Largest inflow categories — useful for spotting concentration quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderCategoryList(data.topIncomeCategories.slice(0, 4), onCategoryNavigate)}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <Badge variant="info">Category pulse</Badge>
          <CardTitle>High-signal rows by month</CardTitle>
          <CardDescription>
            Follow the highlighted column when you have narrowed the period scope above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table stickyHeader>
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[14rem]">Category</TableHead>
                {data.months.map((month) => (
                  <TableHead
                    key={month.name}
                    className={cn(
                      "tabular-nums",
                      scopeMonth !== "all" && scopeMonth === month.name && "bg-primary/10 text-primary",
                    )}
                  >
                    {month.shortLabel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {focusRows.map((row) => (
                <TableRow key={`${row.direction}-${row.category}`}>
                  <TableCell className="font-medium">{row.category}</TableCell>
                  {data.months.map((month) => {
                    const amount = row.totals[month.name];
                    const isFocused = scopeMonth !== "all" && scopeMonth === month.name;

                    return (
                      <TableCell
                        key={month.name}
                        className={cn(
                          toneByDirectionText[row.direction],
                          isFocused && "bg-primary/15",
                          amount > 0 && "p-0",
                        )}
                      >
                        {amount > 0 ? (
                          <button
                            type="button"
                            className={cn(
                              "flex h-full w-full items-center justify-start px-4 py-3 text-left motion-safe:transition-[background-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
                              "hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                            )}
                            onClick={() => onCategoryNavigate(row.category, row.direction)}
                          >
                            <span className="tabular-nums">{formatCurrency(amount)}</span>
                          </button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
