import { serializeTransactionsToCsv } from "@/lib/dashboardEngine";
import type { DashboardTransaction } from "@/types/dashboard";

export const downloadTransactionsCsv = (rows: DashboardTransaction[], filename: string) => {
  const csv = serializeTransactionsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
