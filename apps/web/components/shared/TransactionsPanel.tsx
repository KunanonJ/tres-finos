"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { filterTransactions } from "@/lib/filterTransactions";
import { formatCurrency, formatIsoDate } from "@/lib/formatters";
import type { DashboardTransaction } from "@/types/dashboard";

interface TransactionsPanelProps {
  months: string[];
  transactions: DashboardTransaction[];
  activeMonth: string;
  activeDirection: "all" | "IN" | "OUT";
  searchValue: string;
  categoryFilter: string;
  onMonthChange: (month: string) => void;
  onDirectionChange: (direction: "all" | "IN" | "OUT") => void;
  onSearchChange: (value: string) => void;
  onClearCategory: () => void;
}

type TransactionFilterDirection = "all" | "IN" | "OUT";

const pageSize = 12;

interface TransactionsResultsProps {
  filteredTransactions: DashboardTransaction[];
}

const TransactionsResults = ({ filteredTransactions }: TransactionsResultsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const handlePageChange = (nextPage: number) => {
    startTransition(() => {
      setCurrentPage(Math.max(1, Math.min(nextPage, totalPages)));
    });
  };

  return (
    <>
      <Table stickyHeader>
        <TableHeader sticky>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="font-medium text-foreground">No matching transactions</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Try a different month, clearing the category chip, or a broader search.
                    Amount and balance columns use tabular numbers for easier scanning.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatIsoDate(transaction.isoDate)}
                  <div className="mt-1 text-[0.68rem] uppercase tracking-[0.18em]">
                    {transaction.time}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{transaction.transactionCode}</TableCell>
                <TableCell>
                  <div className="flex max-w-md flex-col gap-1">
                    <span className="font-medium text-foreground">{transaction.description}</span>
                    <span className="text-sm text-muted-foreground">
                      {transaction.counterparty}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>
                  <Badge variant={transaction.direction === "IN" ? "positive" : "critical"}>
                    {transaction.direction}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    transaction.direction === "IN"
                      ? "font-semibold text-finance-positive"
                      : "font-semibold text-finance-critical"
                  }`}
                >
                  {transaction.direction === "IN" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(transaction.runningBalance)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(safePage - 1) * pageSize + 1} to{" "}
          {Math.min(safePage * pageSize, filteredTransactions.length)} of{" "}
          {filteredTransactions.length} filtered rows
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
          >
            <ArrowLeft data-icon="inline-start" />
            Previous
          </Button>
          <Badge variant="outline">
            Page {safePage} of {totalPages}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
          >
            Next
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </>
  );
};

export const TransactionsPanel = ({
  activeDirection,
  activeMonth,
  categoryFilter,
  months,
  onClearCategory,
  onDirectionChange,
  onMonthChange,
  onSearchChange,
  searchValue,
  transactions,
}: TransactionsPanelProps) => {
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearch = deferredSearchValue.trim().toLowerCase();

  const filteredTransactions = filterTransactions(transactions, {
    month: activeMonth,
    direction: activeDirection,
    query: normalizedSearch,
    category: categoryFilter,
  });

  const filterKey = `${activeMonth}|${activeDirection}|${categoryFilter}|${normalizedSearch}`;

  const handleSearchChange = (nextValue: string) => {
    startTransition(() => {
      onSearchChange(nextValue);
    });
  };

  const handleMonthChange = (nextMonth: string) => {
    startTransition(() => {
      onMonthChange(nextMonth);
    });
  };

  const handleDirectionChange = (nextDirection: TransactionFilterDirection) => {
    startTransition(() => {
      onDirectionChange(nextDirection);
    });
  };

  return (
    <Card>
      <CardHeader>
        <Badge variant="info">Transactions</Badge>
        <CardTitle>Interactive transaction explorer</CardTitle>
        <CardDescription>
          Filters share the same period scope as the rest of the dashboard. Refine by direction,
          text, or jump here from any chart row.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {categoryFilter ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[1rem] border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Category filter:{" "}
              <span className="font-medium text-foreground">{categoryFilter}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1"
              onClick={() => onClearCategory()}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <div className="relative w-full max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dashboard-transactions-search"
              className="pl-9"
              placeholder="Search descriptions, counterparties, categories, or codes"
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-busy={deferredSearchValue !== searchValue}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeMonth === "all" ? "secondary" : "outline"}
                onClick={() => handleMonthChange("all")}
              >
                All months
              </Button>
              {months.map((month) => (
                <Button
                  key={month}
                  size="sm"
                  variant={activeMonth === month ? "secondary" : "outline"}
                  onClick={() => handleMonthChange(month)}
                >
                  {month}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeDirection === "all" ? "secondary" : "ghost"}
                onClick={() => handleDirectionChange("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={activeDirection === "IN" ? "secondary" : "ghost"}
                onClick={() => handleDirectionChange("IN")}
              >
                In
              </Button>
              <Button
                size="sm"
                variant={activeDirection === "OUT" ? "secondary" : "ghost"}
                onClick={() => handleDirectionChange("OUT")}
              >
                Out
              </Button>
            </div>
          </div>
        </div>

        <TransactionsResults key={filterKey} filteredTransactions={filteredTransactions} />
      </CardContent>
    </Card>
  );
};
