"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/finance-formatters";
import type {
  TransactionRecord,
  TransactionSortKey,
  TransactionTypeFilter,
} from "@/types/finance";

const PAGE_SIZE = 12;

const TransactionsPanel = ({
  monthLabels,
  transactions,
}: {
  monthLabels: string[];
  transactions: TransactionRecord[];
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [sortKey, setSortKey] = useState<TransactionSortKey>("date");
  const [sortDirection, setSortDirection] = useState<1 | -1>(-1);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesMonth =
        monthFilter === "all" || transaction.month === monthFilter;
      const matchesType =
        typeFilter === "all" || transaction.direction === typeFilter;
      const searchable = [
        transaction.date,
        transaction.time,
        transaction.code,
        transaction.description,
        transaction.counterparty,
        transaction.category,
        transaction.month,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        deferredSearch.length === 0 || searchable.includes(deferredSearch);

      return matchesMonth && matchesType && matchesSearch;
    })
    .sort((left, right) => {
      const leftValue = sortKey === "amount" ? left.amount : left.timestamp;
      const rightValue = sortKey === "amount" ? right.amount : right.timestamp;

      if (leftValue === rightValue) {
        return 0;
      }

      return leftValue > rightValue ? sortDirection : -sortDirection;
    });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleTransactions = filteredTransactions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleSort = (nextSortKey: TransactionSortKey) => {
    startTransition(() => {
      if (sortKey === nextSortKey) {
        setSortDirection((previous) => (previous === 1 ? -1 : 1));
        return;
      }

      setSortKey(nextSortKey);
      setSortDirection(nextSortKey === "date" ? -1 : 1);
    });
  };

  const resetPage = () => {
    startTransition(() => {
      setPage(1);
    });
  };

  const pageLabel =
    filteredTransactions.length === 0
      ? "0 transactions"
      : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
          safePage * PAGE_SIZE,
          filteredTransactions.length,
        )} of ${filteredTransactions.length}`;

  return (
    <Card className="border border-border/70 bg-card/80 backdrop-blur-xl">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Transactions workspace</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search, sort, and inspect the classified quarter ledger.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                startTransition(() => {
                  setSearch(event.target.value);
                  setPage(1);
                });
              }}
              placeholder="Search date, counterparty, code, or category"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={monthFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setMonthFilter("all");
                  resetPage();
                });
              }}
            >
              All months
            </Button>
            {monthLabels.map((label) => (
              <Button
                key={label}
                variant={monthFilter === label ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setMonthFilter(label);
                    resetPage();
                  });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "IN", "OUT"] as const).map((value) => (
              <Button
                key={value}
                variant={typeFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setTypeFilter(value);
                    resetPage();
                  });
                }}
              >
                {value === "all" ? "All types" : value}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table className="[&_td]:whitespace-normal [&_th]:whitespace-normal">
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-2"
                >
                  Date
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => handleSort("amount")}
                  className="ml-auto flex items-center gap-2"
                >
                  Amount
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="text-right">Running balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTransactions.length > 0 ? (
              visibleTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="border-border/50">
                  <TableCell className="min-w-28">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {transaction.date}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {transaction.time}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-28 text-muted-foreground">
                    {transaction.month}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.direction === "IN" ? "secondary" : "outline"
                      }
                      className={cn(
                        transaction.direction === "IN"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-300",
                      )}
                    >
                      {transaction.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {transaction.code}
                  </TableCell>
                  <TableCell className="min-w-64 max-w-md">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="min-w-48 text-muted-foreground">
                    {transaction.counterparty}
                  </TableCell>
                  <TableCell className="min-w-48">
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      transaction.direction === "IN"
                        ? "text-emerald-300"
                        : "text-rose-300",
                    )}
                  >
                    {transaction.direction === "IN" ? "+" : "−"}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(transaction.balance)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No transactions match the current filter set.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{pageLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Badge variant="outline">
              Page {safePage} / {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((previous) => Math.min(totalPages, previous + 1))
              }
              disabled={safePage === totalPages}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsPanel;
