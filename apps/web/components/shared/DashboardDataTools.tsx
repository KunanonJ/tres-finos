"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Printer, Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { downloadTransactionsCsv } from "@/lib/dashboardExport";
import { downloadLedgerBackup, restoreLedgerBackupFromText } from "@/lib/ledgerBackup";
import { filterTransactions } from "@/lib/filterTransactions";
import { directionToTransaction } from "@/lib/dashboardUrlState";
import type { DashboardTransaction } from "@/types/dashboard";
import type { UrlDirectionFilter } from "@/lib/dashboardUrlState";

interface DashboardDataToolsProps {
  transactions: DashboardTransaction[];
  exportFilenameBase: string;
  activeMonth: string;
  direction: UrlDirectionFilter;
  searchQuery: string;
  category: string;
}

export const DashboardDataTools = ({
  activeMonth,
  category,
  direction,
  exportFilenameBase,
  searchQuery,
  transactions,
}: DashboardDataToolsProps) => {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleExportFiltered = useCallback(() => {
    const filtered = filterTransactions(transactions, {
      month: activeMonth,
      direction: directionToTransaction(direction),
      query: searchQuery.trim().toLowerCase(),
      category,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTransactionsCsv(filtered, `${exportFilenameBase}-${stamp}.csv`);
  }, [activeMonth, category, direction, exportFilenameBase, searchQuery, transactions]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRestorePick = useCallback(async (file: File | null) => {
    setRestoreError(null);
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      restoreLedgerBackupFromText(text);
      window.location.reload();
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : "Invalid backup file.");
    }
  }, []);

  return (
    <div className="no-print flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {restoreError ? (
        <p className="w-full text-xs text-destructive sm:order-last">{restoreError}</p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={handleExportFiltered}
        title="Exports rows matching current URL filters (month, direction, search, category)"
      >
        <Download className="size-3.5" aria-hidden />
        Export CSV
      </Button>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
        <Printer className="size-3.5" aria-hidden />
        Print
      </Button>
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Restore ledger backup JSON"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleRestorePick(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="gap-1.5"
        onClick={() => restoreInputRef.current?.click()}
      >
        <Upload className="size-3.5" aria-hidden />
        Restore
      </Button>
      <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={downloadLedgerBackup}>
        <Save className="size-3.5" aria-hidden />
        Backup
      </Button>
    </div>
  );
};
