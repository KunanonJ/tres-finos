import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import type { DashboardData } from "@/types/dashboard";

import { buildDashboardDataFromTransactions, parseCsvToTransactions } from "@/lib/dashboardEngine";

const dataFilePath = path.join(process.cwd(), "lib/data/gogo_cfo_q1_2026_transactions.csv");

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const csvContent = await fs.readFile(dataFilePath, "utf8");
  const transactions = parseCsvToTransactions(csvContent);
  return buildDashboardDataFromTransactions(transactions);
});
