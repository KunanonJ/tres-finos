import { z } from "zod";

import type {
  CategoryTotal,
  DashboardData,
  DashboardInsight,
  DashboardTotals,
  DashboardTransaction,
  MonthSummary,
  MonthlyCategoryRow,
  TransactionDirection,
} from "@/types/dashboard";

const csvRowSchema = z.object({
  month: z.string().min(1),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  transactionCode: z.string().min(1),
  description: z.string().min(1),
  counterparty: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  direction: z.enum(["IN", "OUT"]),
  category: z.string().min(1),
  runningBalance: z.coerce.number().nonnegative(),
});

const categoryOrder = [
  "Affiliate Revenue",
  "International Revenue",
  "Internal Transfer IN",
  "Payroll – Core Staff",
  "Payroll – Management",
  "Operations & Reimbursable",
  "Professional Services",
  "Tax & Government",
  "Bank Fees",
  "Affiliate Cashback OUT",
];

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      cells.push(currentCell);
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell);

  return cells;
};

const toIsoDate = (value: string) => {
  const [day, month, year] = value.split("/");

  return `${year}-${month}-${day}`;
};

const getMonthShortLabel = (value: string) => {
  const [name] = value.split(" ");

  return name.slice(0, 3);
};

const getOpeningBalance = (transaction: DashboardTransaction) =>
  transaction.direction === "IN"
    ? transaction.runningBalance - transaction.amount
    : transaction.runningBalance + transaction.amount;

const sortTransactions = (transactions: DashboardTransaction[]) =>
  [...transactions].sort((left, right) => {
    const leftKey = `${left.isoDate}T${left.time}`;
    const rightKey = `${right.isoDate}T${right.time}`;

    if (leftKey === rightKey) {
      return left.id.localeCompare(right.id);
    }

    return leftKey.localeCompare(rightKey);
  });

const buildMonthlySummaries = (transactions: DashboardTransaction[]) => {
  const buckets = new Map<string, DashboardTransaction[]>();

  for (const transaction of transactions) {
    const existing = buckets.get(transaction.month) ?? [];
    existing.push(transaction);
    buckets.set(transaction.month, existing);
  }

  const sortedMonths = [...buckets.entries()]
    .map(([name, monthTransactions]) => [name, sortTransactions(monthTransactions)] as const)
    .sort((left, right) => left[1][0].isoDate.localeCompare(right[1][0].isoDate));

  const months: MonthSummary[] = [];

  for (const [name, monthTransactions] of sortedMonths) {
    const totalRevenue = monthTransactions
      .filter((transaction) => transaction.direction === "IN")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpenses = monthTransactions
      .filter((transaction) => transaction.direction === "OUT")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const affiliateRevenue = monthTransactions
      .filter(
        (transaction) =>
          transaction.direction === "IN" && transaction.category === "Affiliate Revenue",
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const payrollTotal = monthTransactions
      .filter(
        (transaction) =>
          transaction.direction === "OUT" &&
          (transaction.category === "Payroll – Core Staff" ||
            transaction.category === "Payroll – Management"),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const taxTotal = monthTransactions
      .filter(
        (transaction) =>
          transaction.direction === "OUT" && transaction.category === "Tax & Government",
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const beginningBalance = getOpeningBalance(monthTransactions[0]);
    const endingBalance = monthTransactions[monthTransactions.length - 1].runningBalance;
    const variableExpenses = Math.max(totalExpenses - payrollTotal, 0);

    months.push({
      name,
      shortLabel: getMonthShortLabel(name),
      beginningBalance,
      endingBalance,
      totalRevenue,
      totalExpenses,
      netCashFlow: totalRevenue - totalExpenses,
      affiliateRevenue,
      payrollTotal,
      taxTotal,
      recurringExpenses: payrollTotal,
      variableExpenses,
      revenueConcentrationShare: totalRevenue === 0 ? 0 : affiliateRevenue / totalRevenue,
    });
  }

  return months;
};

const buildCategoryTotals = (
  transactions: DashboardTransaction[],
  direction: TransactionDirection,
): CategoryTotal[] => {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.direction !== direction) {
      continue;
    }

    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
  }

  const combinedTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: combinedTotal === 0 ? 0 : amount / combinedTotal,
      direction,
    }))
    .sort((left, right) => right.amount - left.amount);
};

const buildMonthlyPnlRows = (
  transactions: DashboardTransaction[],
  months: MonthSummary[],
): MonthlyCategoryRow[] => {
  const monthNames = months.map((month) => month.name);
  const rowMap = new Map<string, MonthlyCategoryRow>();

  for (const transaction of transactions) {
    const rowKey = `${transaction.direction}:${transaction.category}`;
    const existingRow = rowMap.get(rowKey) ?? {
      category: transaction.category,
      direction: transaction.direction,
      totals: Object.fromEntries(monthNames.map((monthName) => [monthName, 0])),
    };

    existingRow.totals[transaction.month] += transaction.amount;
    rowMap.set(rowKey, existingRow);
  }

  return [...rowMap.values()].sort((left, right) => {
    if (left.direction !== right.direction) {
      return left.direction === "IN" ? -1 : 1;
    }

    const leftIndex = categoryOrder.indexOf(left.category);
    const rightIndex = categoryOrder.indexOf(right.category);

    if (leftIndex === -1 || rightIndex === -1) {
      return left.category.localeCompare(right.category);
    }

    return leftIndex - rightIndex;
  });
};

const buildInsights = (months: MonthSummary[], totals: DashboardTotals): DashboardInsight[] => {
  const insights: DashboardInsight[] = [];
  const latestMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  if (totals.runwayMonths !== null) {
    if (totals.runwayMonths < 3) {
      insights.push({
        tone: "critical",
        title: "Critical cash runway",
        body: `The current balance covers roughly ${totals.runwayMonths.toFixed(1)} months of burn. Reduce discretionary spend or secure new cash before the next payroll cycle.`,
      });
    } else if (totals.runwayMonths < 6) {
      insights.push({
        tone: "warning",
        title: "Liquidity floor is getting close",
        body: `Runway is at ${totals.runwayMonths.toFixed(1)} months. Keep affiliate revenue pacing high and slow down reimbursable spending while balance recovers.`,
      });
    } else {
      insights.push({
        tone: "positive",
        title: "Cash runway is stable",
        body: `Runway remains above six months at the current burn rate. Maintain discipline on recurring costs while the income mix broadens.`,
      });
    }
  }

  if (previousMonth) {
    const revenueDelta = latestMonth.totalRevenue - previousMonth.totalRevenue;
    const changePct =
      previousMonth.totalRevenue === 0 ? 0 : revenueDelta / previousMonth.totalRevenue;

    insights.push({
      tone: revenueDelta >= 0 ? "positive" : "warning",
      title:
        revenueDelta >= 0
          ? "Revenue momentum improved"
          : "Revenue softened month over month",
      body: `${latestMonth.name} revenue moved ${Math.abs(changePct * 100).toFixed(1)}% ${revenueDelta >= 0 ? "above" : "below"} ${previousMonth.name}.`,
    });
  }

  insights.push({
    tone: totals.affiliateRevenueShare > 0.7 ? "warning" : "info",
    title: "Affiliate concentration check",
    body: `Affiliate revenue represents ${(totals.affiliateRevenueShare * 100).toFixed(1)}% of Q1 inflows, so partner diversification remains a high-priority finance task.`,
  });

  if (latestMonth.totalRevenue > 0) {
    const payrollRatio = latestMonth.payrollTotal / latestMonth.totalRevenue;

    insights.push({
      tone: payrollRatio > 0.6 ? "warning" : "positive",
      title: "Payroll efficiency",
      body: `${latestMonth.name} payroll landed at ${(payrollRatio * 100).toFixed(1)}% of revenue. Keep watching this ratio as affiliate revenue fluctuates.`,
    });
  }

  if (latestMonth.taxTotal > 0) {
    insights.push({
      tone: "info",
      title: "Tax remittance activity",
      body: `${latestMonth.name} includes ${latestMonth.taxTotal.toLocaleString("en-US", {
        style: "currency",
        currency: "THB",
      })} in tax and government payments. Reconcile withholding certificates alongside the ledger.`,
    });
  }

  return insights;
};

export const parseCsvToTransactions = (csvContent: string): DashboardTransaction[] => {
  const [headerLine, ...lines] = csvContent.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const rows: DashboardTransaction[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const parsedRow = csvRowSchema.parse({
      month: record.Month,
      date: record.Date,
      time: record.Time,
      transactionCode: record["Transaction Code"],
      description: record.Description,
      counterparty: record.Counterparty,
      amount: record["Amount (THB)"],
      direction: record.Direction,
      category: record.Category,
      runningBalance: record["Running Balance"],
    } satisfies Record<string, string>);
    const isoDate = toIsoDate(parsedRow.date);

    rows.push({
      id: `${isoDate}-${parsedRow.transactionCode}-${index}`,
      month: parsedRow.month,
      isoDate,
      displayDate: parsedRow.date,
      time: parsedRow.time,
      transactionCode: parsedRow.transactionCode,
      description: parsedRow.description,
      counterparty: parsedRow.counterparty,
      amount: parsedRow.amount,
      direction: parsedRow.direction,
      category: parsedRow.category,
      runningBalance: parsedRow.runningBalance,
    });
  });

  return sortTransactions(rows);
};

const LEDGER_CSV_HEADER =
  "Month,Date,Time,Transaction Code,Description,Counterparty,Amount (THB),Direction,Category,Running Balance";

const escapeLedgerCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

/** Writes the same shape as the built-in ledger CSV (used after PDF ingest). */
export const serializeTransactionsToCsv = (rows: DashboardTransaction[]): string => {
  const sorted = sortTransactions(rows);
  const lines = [LEDGER_CSV_HEADER];

  for (const row of sorted) {
    lines.push(
      [
        escapeLedgerCsvCell(row.month),
        escapeLedgerCsvCell(row.displayDate),
        escapeLedgerCsvCell(row.time),
        escapeLedgerCsvCell(row.transactionCode),
        escapeLedgerCsvCell(row.description),
        escapeLedgerCsvCell(row.counterparty),
        escapeLedgerCsvCell(row.amount.toFixed(2)),
        row.direction,
        escapeLedgerCsvCell(row.category),
        escapeLedgerCsvCell(row.runningBalance.toFixed(2)),
      ].join(","),
    );
  }

  return lines.join("\n");
};

export const mergeLedgerWithUploads = (
  baseTransactions: DashboardTransaction[],
  uploadsByMonth: Record<string, string>,
): DashboardTransaction[] => {
  const replacementMonths = new Set(
    Object.entries(uploadsByMonth)
      .filter(([, csv]) => csv.trim().length > 0)
      .map(([month]) => month),
  );

  let kept = baseTransactions.filter((transaction) => !replacementMonths.has(transaction.month));

  for (const [monthName, csv] of Object.entries(uploadsByMonth)) {
    if (!csv.trim()) {
      continue;
    }

    const rows = parseCsvToTransactions(csv);

    if (rows.length === 0) {
      throw new Error(`The CSV for ${monthName} must include at least one transaction row.`);
    }

    const wrongMonth = rows.filter((row) => row.month !== monthName);

    if (wrongMonth.length > 0) {
      const found = [...new Set(wrongMonth.map((row) => row.month))].join(", ");
      throw new Error(`Every row must list Month as "${monthName}". Found: ${found}.`);
    }

    kept = [...kept, ...rows];
  }

  return sortTransactions(kept);
};

export const buildDashboardDataFromTransactions = (
  transactions: DashboardTransaction[],
): DashboardData => {
  const months = buildMonthlySummaries(transactions);
  const topExpenseCategories = buildCategoryTotals(transactions, "OUT");
  const topIncomeCategories = buildCategoryTotals(transactions, "IN");
  const netCashFlow = months.reduce((sum, month) => sum + month.netCashFlow, 0);
  const totalRevenue = months.reduce((sum, month) => sum + month.totalRevenue, 0);
  const totalExpenses = months.reduce((sum, month) => sum + month.totalExpenses, 0);
  const currentBalance = months[months.length - 1]?.endingBalance ?? 0;
  const averageMonthlyBurn =
    months.length === 0
      ? 0
      : months.reduce((sum, month) => sum + Math.max(month.totalExpenses - month.totalRevenue, 0), 0) /
        months.length;
  const runwayMonths = averageMonthlyBurn > 0 ? currentBalance / averageMonthlyBurn : null;
  const affiliateRevenueShare =
    totalRevenue === 0
      ? 0
      : months.reduce((sum, month) => sum + month.affiliateRevenue, 0) / totalRevenue;
  const latestRevenueChangePct =
    months.length < 2 || months[months.length - 2].totalRevenue === 0
      ? null
      : (months[months.length - 1].totalRevenue - months[months.length - 2].totalRevenue) /
        months[months.length - 2].totalRevenue;
  const totals: DashboardTotals = {
    totalRevenue,
    totalExpenses,
    netCashFlow,
    currentBalance,
    averageMonthlyBurn,
    runwayMonths,
    affiliateRevenueShare,
    latestRevenueChangePct,
  };

  return {
    months,
    transactions,
    insights: buildInsights(months, totals),
    topExpenseCategories,
    topIncomeCategories,
    monthlyPnlRows: buildMonthlyPnlRows(transactions, months),
    totals,
  };
};
