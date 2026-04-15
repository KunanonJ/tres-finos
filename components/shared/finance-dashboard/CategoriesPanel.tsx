import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/finance-formatters";
import type { CategoryTrendPoint, ChartDatum } from "@/types/finance";
import { DonutChart, MultiLineTrendChart } from "./charts";

const CategoryList = ({
  title,
  items,
}: {
  title: string;
  items: ChartDatum[];
}) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/45 px-4 py-3"
          >
            <div className="space-y-1">
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(item.value / total)}
              </p>
            </div>
            <Badge variant="outline">{formatCurrency(item.value)}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const CategoriesPanel = ({
  expenseCategoryTotals,
  incomeCategoryTotals,
  categoryTrend,
}: {
  expenseCategoryTotals: ChartDatum[];
  incomeCategoryTotals: ChartDatum[];
  categoryTrend: CategoryTrendPoint[];
}) => {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Expense breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <DonutChart
              data={expenseCategoryTotals.slice(0, 6)}
              totalLabel="Quarter expenses"
            />
            <div className="space-y-3">
              {expenseCategoryTotals.slice(0, 6).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/45 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Dominant cost bucket
                    </p>
                  </div>
                  <Badge variant="outline">{formatCurrency(item.value)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <CategoryList title="Income sources" items={incomeCategoryTotals} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <CategoryList title="Top expense categories" items={expenseCategoryTotals} />
        <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Key expense trend by month</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiLineTrendChart data={categoryTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategoriesPanel;
