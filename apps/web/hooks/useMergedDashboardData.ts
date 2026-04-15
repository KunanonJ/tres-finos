"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  buildDashboardDataFromTransactions,
  mergeLedgerWithUploads,
} from "@/lib/dashboardEngine";
import {
  loadBankStatementsSnapshot,
  parseBankStatementsSnapshot,
  subscribeBankStatements,
} from "@/lib/bankStatementStorage";
import type { DashboardData } from "@/types/dashboard";

export const useMergedDashboardData = (serverData: DashboardData) => {
  const snapshot = useSyncExternalStore(
    subscribeBankStatements,
    loadBankStatementsSnapshot,
    () => "{}",
  );

  return useMemo(() => {
    const uploads = parseBankStatementsSnapshot(snapshot);
    const hasUploads = Object.keys(uploads).some((key) => uploads[key]?.trim().length);

    if (!hasUploads) {
      return serverData;
    }

    try {
      const merged = mergeLedgerWithUploads(serverData.transactions, uploads);
      return buildDashboardDataFromTransactions(merged);
    } catch (caught) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[dashboard] merge failed; using server ledger", caught);
      }
      return serverData;
    }
  }, [serverData, snapshot]);
};
