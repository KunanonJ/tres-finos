import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  categoryColorMap,
  expenseCategories,
  financeCategories,
  incomeCategories,
  transactionDirections,
  type BalancePoint,
  type CashFlowPoint,
  type CategoryTrendPoint,
  type ChartDatum,
  type DashboardDataset,
  type FinanceCategory,
  type MonthlySummary,
  type QuarterMetrics,
  type TransactionDirection,
  type TransactionRecord,
} from "@/types/finance";

const ACCOUNT_LABEL = "Krungthai Bank Savings Account No. 017-0-54931-3";
const ENTITY_NAME = "GOGO HOLDING (THAILAND) LIMITED PARTNERS";
const CSV_PATH = path.join(
  process.cwd(),
  "gogo_cfo_q1_2026_transactions.csv",
);

const rawTransactionSchema = z.object({
  month: z.string().min(1),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  code: z.string().min(1),
  description: z.string().min(1),
  counterparty: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  direction: z.enum(transactionDirections),
  category: z.enum(financeCategories),
  balance: z.coerce.number().nonnegative(),
});

const parseTimestamp = (date: string, time: string): number => {
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return Date.UTC(year, month - 1, day, hours, minutes);
};

const toBeginningBalance = (
  direction: TransactionDirection,
  amount: number,
  runningBalance: number,
): number => {
  return direction === "IN" ? runningBalance - amount : runningBalance + amount;
};

const splitCsvLine = (line: string): string[] => {
  return line.split(",");
};

const createZeroedCategoryTotals = (): Record<FinanceCategory, number> => {
  return financeCategories.reduce<Record<FinanceCategory, number>>(
    (accumulator, category) => {
      accumulator[category] = 0;
      return accumulator;
    },
    {} as Record<FinanceCategory, number>,
  );
};

const buildMonthlySummary = (
  label: string,
  transactions: TransactionRecord[],
): MonthlySummary => {
  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const categoryTotals = createZeroedCategoryTotals();

  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const transaction of transactions) {
    categoryTotals[transaction.category] += transaction.amount;

    if (transaction.direction === "IN") {
      totalRevenue += transaction.amount;
      continue;
    }

    totalExpenses += transaction.amount;
  }

  const totalPayroll =
    categoryTotals["Payroll – Core Staff"] +
    categoryTotals["Payroll – Management"];
  const recurringExpenses = totalPayroll;
  const variableExpenses = Math.max(totalExpenses - recurringExpenses, 0);
  const netCashFlow = totalRevenue - totalExpenses;
  const burnRate = Math.max(totalExpenses - totalRevenue, 0);
  const payrollRatio = totalRevenue > 0 ? totalPayroll / totalRevenue : 0;
  const concentrationShare =
    totalRevenue > 0 ? categoryTotals["Affiliate Revenue"] / totalRevenue : 0;

  return {
    label,
    beginningBalance: toBeginningBalance(
      first.direction,
      first.amount,
      first.balance,
    ),
    endingBalance: last.balance,
    totalRevenue,
    totalExpenses,
    affiliateRevenue: categoryTotals["Affiliate Revenue"],
    internationalRevenue: categoryTotals["International Revenue"],
    internalTransferIn: categoryTotals["Internal Transfer IN"],
    payrollCore: categoryTotals["Payroll – Core Staff"],
    payrollManagement: categoryTotals["Payroll – Management"],
    operationsSpend: categoryTotals["Operations & Reimbursable"],
    professionalServices: categoryTotals["Professional Services"],
    taxPaid: categoryTotals["Tax & Government"],
    bankFees: categoryTotals["Bank Fees"],
    cashback: categoryTotals["Affiliate Cashback OUT"],
    otherOut: categoryTotals["Other / Unclassified"],
    totalPayroll,
    recurringExpenses,
    variableExpenses,
    netCashFlow,
    burnRate,
    payrollRatio,
    concentrationShare,
    taxPaymentCount: transactions.filter(
      (transaction) => transaction.category === "Tax & Government",
    ).length,
  };
};

const buildQuarterMetrics = (months: MonthlySummary[]): QuarterMetrics => {
  const latest = months[months.length - 1];
  const previous = months.length > 1 ? months[months.length - 2] : null;
  const totalRevenue = months.reduce(
    (sum, month) => sum + month.totalRevenue,
    0,
  );
  const totalExpenses = months.reduce(
    (sum, month) => sum + month.totalExpenses,
    0,
  );
  const totalPayroll = months.reduce(
    (sum, month) => sum + month.totalPayroll,
    0,
  );
  const totalTax = months.reduce((sum, month) => sum + month.taxPaid, 0);
  const totalBankFees = months.reduce(
    (sum, month) => sum + month.bankFees,
    0,
  );
  const affiliateRevenue = months.reduce(
    (sum, month) => sum + month.affiliateRevenue,
    0,
  );
  const netCashFlow = totalRevenue - totalExpenses;
  const averageBurn =
    months.reduce((sum, month) => sum + month.burnRate, 0) / months.length;
  const runwayMonths =
    averageBurn > 0 ? latest.endingBalance / averageBurn : Number.POSITIVE_INFINITY;
  const fundraiseAlert = averageBurn * 3;
  const liquidityFloor = averageBurn * 6;
  const concentrationShare =
    totalRevenue > 0 ? affiliateRevenue / totalRevenue : 0;
  const worstPayrollMonth = months.reduce((worst, month) => {
    return month.payrollRatio > worst.payrollRatio ? month : worst;
  }, months[0]);
  const highestBurnMonth = months.reduce((worst, month) => {
    return month.burnRate > worst.burnRate ? month : worst;
  }, months[0]);

  return {
    latest,
    previous,
    totalRevenue,
    totalExpenses,
    totalPayroll,
    totalTax,
    totalBankFees,
    affiliateRevenue,
    netCashFlow,
    averageBurn,
    runwayMonths,
    fundraiseAlert,
    liquidityFloor,
    concentrationShare,
    worstPayrollMonth,
    highestBurnMonth,
    concentrationBreaches: months
      .filter((month) => month.concentrationShare > 0.7)
      .map((month) => month.label),
    negativeMonths: months
      .filter((month) => month.netCashFlow < 0)
      .map((month) => month.label),
  };
};

const buildChartTotals = (
  transactions: TransactionRecord[],
  categories: readonly FinanceCategory[],
): ChartDatum[] => {
  return categories
    .map((category) => {
      const value = transactions.reduce((sum, transaction) => {
        if (transaction.category !== category) {
          return sum;
        }

        return sum + transaction.amount;
      }, 0);

      return {
        label: category,
        value,
        color: categoryColorMap[category],
      };
    })
    .filter((datum) => datum.value > 0)
    .sort((left, right) => right.value - left.value);
};

const buildBalanceSeries = (transactions: TransactionRecord[]): BalancePoint[] => {
  const series: BalancePoint[] = [];

  if (transactions.length === 0) {
    return series;
  }

  const first = transactions[0];
  series.push({
    label: "Start",
    month: first.month,
    value: toBeginningBalance(first.direction, first.amount, first.balance),
  });

  for (const transaction of transactions) {
    series.push({
      label: transaction.date,
      month: transaction.month,
      value: transaction.balance,
    });
  }

  return series;
};

const buildCashFlowSeries = (months: MonthlySummary[]): CashFlowPoint[] => {
  return months.map((month) => ({
    month: month.label,
    revenue: month.totalRevenue,
    expenses: month.totalExpenses,
    net: month.netCashFlow,
  }));
};

const buildCategoryTrend = (months: MonthlySummary[]): CategoryTrendPoint[] => {
  return months.map((month) => ({
    month: month.label,
    operations: month.operationsSpend,
    payroll: month.totalPayroll,
    tax: month.taxPaid,
    cashback: month.cashback,
  }));
};

export const getFinanceDashboardData = cache(async (): Promise<DashboardDataset> => {
  try {
    const fileContent = await readFile(CSV_PATH, "utf8");
    const lines = fileContent.trim().split(/\r?\n/);
    const [, ...rows] = lines;

    const transactions = rows
      .map((line, index) => {
        const columns = splitCsvLine(line);

        if (columns.length !== 10) {
          throw new Error(`Unexpected CSV shape on row ${index + 2}.`);
        }

        const parsed = rawTransactionSchema.parse({
          month: columns[0],
          date: columns[1],
          time: columns[2],
          code: columns[3],
          description: columns[4],
          counterparty: columns[5],
          amount: columns[6],
          direction: columns[7],
          category: columns[8],
          balance: columns[9],
        });

        return {
          id: `tx-${index + 1}`,
          ...parsed,
          timestamp: parseTimestamp(parsed.date, parsed.time),
        } satisfies TransactionRecord;
      })
      .sort((left, right) => left.timestamp - right.timestamp);

    const monthMap = transactions.reduce<Map<string, TransactionRecord[]>>(
      (accumulator, transaction) => {
        const existing = accumulator.get(transaction.month) ?? [];
        existing.push(transaction);
        accumulator.set(transaction.month, existing);
        return accumulator;
      },
      new Map<string, TransactionRecord[]>(),
    );

    const months = Array.from(monthMap.entries()).map(([label, monthTransactions]) =>
      buildMonthlySummary(label, monthTransactions),
    );

    const metrics = buildQuarterMetrics(months);
    const expenseTransactions = transactions.filter(
      (transaction) => transaction.direction === "OUT",
    );
    const incomeTransactions = transactions.filter(
      (transaction) => transaction.direction === "IN",
    );

    return {
      entityName: ENTITY_NAME,
      accountLabel: ACCOUNT_LABEL,
      monthLabels: months.map((month) => month.label),
      transactions,
      months,
      metrics,
      balanceSeries: buildBalanceSeries(transactions),
      cashFlowSeries: buildCashFlowSeries(months),
      expenseCategoryTotals: buildChartTotals(expenseTransactions, expenseCategories),
      incomeCategoryTotals: buildChartTotals(incomeTransactions, incomeCategories),
      categoryTrend: buildCategoryTrend(months),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Finance dataset validation failed: ${error.message}`);
    }

    if (error instanceof Error) {
      throw new Error(`Unable to build finance dashboard data: ${error.message}`);
    }

    throw new Error("Unable to build finance dashboard data.");
  }
});
