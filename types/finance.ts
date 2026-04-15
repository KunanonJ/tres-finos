export const transactionDirections = ["IN", "OUT"] as const;

export const financeCategories = [
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
  "Other / Unclassified",
] as const;

export const expenseCategories = [
  "Payroll – Core Staff",
  "Payroll – Management",
  "Operations & Reimbursable",
  "Professional Services",
  "Tax & Government",
  "Bank Fees",
  "Affiliate Cashback OUT",
  "Other / Unclassified",
] as const;

export const incomeCategories = [
  "Affiliate Revenue",
  "International Revenue",
  "Internal Transfer IN",
] as const;

export const categoryColorMap = {
  "Affiliate Revenue": "#00E5B0",
  "International Revenue": "#4DFFB0",
  "Internal Transfer IN": "#00C8E5",
  "Payroll – Core Staff": "#FF4F6E",
  "Payroll – Management": "#FF8080",
  "Operations & Reimbursable": "#FFB347",
  "Professional Services": "#6B6BFF",
  "Tax & Government": "#FF8C42",
  "Bank Fees": "#505060",
  "Affiliate Cashback OUT": "#00A5C8",
  "Other / Unclassified": "#384050",
} as const satisfies Record<(typeof financeCategories)[number], string>;

export const dashboardTabs = [
  "overview",
  "monthly",
  "transactions",
  "categories",
] as const;

export type TransactionDirection = (typeof transactionDirections)[number];
export type FinanceCategory = (typeof financeCategories)[number];
export type ExpenseCategory = (typeof expenseCategories)[number];
export type IncomeCategory = (typeof incomeCategories)[number];
export type DashboardTab = (typeof dashboardTabs)[number];
export type TransactionSortKey = "date" | "amount";
export type TransactionTypeFilter = "all" | TransactionDirection;

export interface TransactionRecord {
  id: string;
  month: string;
  date: string;
  time: string;
  code: string;
  description: string;
  counterparty: string;
  amount: number;
  direction: TransactionDirection;
  category: FinanceCategory;
  balance: number;
  timestamp: number;
}

export interface MonthlySummary {
  label: string;
  beginningBalance: number;
  endingBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  affiliateRevenue: number;
  internationalRevenue: number;
  internalTransferIn: number;
  payrollCore: number;
  payrollManagement: number;
  operationsSpend: number;
  professionalServices: number;
  taxPaid: number;
  bankFees: number;
  cashback: number;
  otherOut: number;
  totalPayroll: number;
  recurringExpenses: number;
  variableExpenses: number;
  netCashFlow: number;
  burnRate: number;
  payrollRatio: number;
  concentrationShare: number;
  taxPaymentCount: number;
}

export interface QuarterMetrics {
  latest: MonthlySummary;
  previous: MonthlySummary | null;
  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;
  totalTax: number;
  totalBankFees: number;
  affiliateRevenue: number;
  netCashFlow: number;
  averageBurn: number;
  runwayMonths: number;
  fundraiseAlert: number;
  liquidityFloor: number;
  concentrationShare: number;
  worstPayrollMonth: MonthlySummary;
  highestBurnMonth: MonthlySummary;
  concentrationBreaches: string[];
  negativeMonths: string[];
}

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

export interface BalancePoint {
  label: string;
  month: string;
  value: number;
}

export interface CashFlowPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface CategoryTrendPoint {
  month: string;
  operations: number;
  payroll: number;
  tax: number;
  cashback: number;
}

export interface DashboardDataset {
  entityName: string;
  accountLabel: string;
  monthLabels: string[];
  transactions: TransactionRecord[];
  months: MonthlySummary[];
  metrics: QuarterMetrics;
  balanceSeries: BalancePoint[];
  cashFlowSeries: CashFlowPoint[];
  expenseCategoryTotals: ChartDatum[];
  incomeCategoryTotals: ChartDatum[];
  categoryTrend: CategoryTrendPoint[];
}
