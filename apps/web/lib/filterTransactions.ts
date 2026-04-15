import type { DashboardTransaction, TransactionDirection } from "@/types/dashboard";

export type TransactionDirectionFilter = "all" | TransactionDirection;

export interface TransactionFilterInput {
  month: string;
  direction: TransactionDirectionFilter;
  query: string;
  category: string;
}

export const filterTransactions = (
  transactions: DashboardTransaction[],
  filters: TransactionFilterInput,
): DashboardTransaction[] => {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const normalizedCategory = filters.category.trim();

  return transactions.filter((transaction) => {
    if (filters.month !== "all" && transaction.month !== filters.month) {
      return false;
    }

    if (filters.direction !== "all" && transaction.direction !== filters.direction) {
      return false;
    }

    if (normalizedCategory && transaction.category !== normalizedCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      transaction.description.toLowerCase().includes(normalizedQuery) ||
      transaction.counterparty.toLowerCase().includes(normalizedQuery) ||
      transaction.category.toLowerCase().includes(normalizedQuery) ||
      transaction.transactionCode.toLowerCase().includes(normalizedQuery)
    );
  });
};
