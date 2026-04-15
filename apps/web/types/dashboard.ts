export type TransactionDirection = "IN" | "OUT";

export type InsightTone = "positive" | "warning" | "critical" | "info";

export interface DashboardTransaction {
  id: string;
  month: string;
  isoDate: string;
  displayDate: string;
  time: string;
  transactionCode: string;
  description: string;
  counterparty: string;
  amount: number;
  direction: TransactionDirection;
  category: string;
  runningBalance: number;
}

export interface MonthSummary {
  name: string;
  shortLabel: string;
  beginningBalance: number;
  endingBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
  affiliateRevenue: number;
  payrollTotal: number;
  taxTotal: number;
  recurringExpenses: number;
  variableExpenses: number;
  revenueConcentrationShare: number;
}

export interface DashboardInsight {
  tone: InsightTone;
  title: string;
  body: string;
}

export interface CategoryTotal {
  category: string;
  amount: number;
  share: number;
  direction: TransactionDirection;
}

export interface MonthlyCategoryRow {
  category: string;
  direction: TransactionDirection;
  totals: Record<string, number>;
}

export interface DashboardTotals {
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
  currentBalance: number;
  averageMonthlyBurn: number;
  runwayMonths: number | null;
  affiliateRevenueShare: number;
  latestRevenueChangePct: number | null;
}

export interface DashboardData {
  months: MonthSummary[];
  transactions: DashboardTransaction[];
  insights: DashboardInsight[];
  topExpenseCategories: CategoryTotal[];
  topIncomeCategories: CategoryTotal[];
  monthlyPnlRows: MonthlyCategoryRow[];
  totals: DashboardTotals;
}
