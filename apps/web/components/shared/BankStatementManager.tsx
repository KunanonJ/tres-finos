"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { parseBankStatementFileForMonth } from "@/lib/bankStatementIngest";
import { serializeTransactionsToCsv } from "@/lib/dashboardEngine";
import {
  parseBankStatementsSnapshot,
  removeMonthBankStatement,
  setMonthBankStatement,
} from "@/lib/bankStatementStorage";
import { formatCurrency, formatIsoDate } from "@/lib/formatters";
import type { DashboardTransaction } from "@/types/dashboard";

interface BankStatementManagerProps {
  monthNames: string[];
  statementsSnapshot: string;
}

const PREVIEW_ROW_LIMIT = 12;

export const BankStatementManager = ({ monthNames, statementsSnapshot }: BankStatementManagerProps) => {
  const uploads = parseBankStatementsSnapshot(statementsSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    fileName: string;
    month: string;
    rows: DashboardTransaction[];
  } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = useCallback(async (month: string, file: File | null) => {
    if (!file) {
      return;
    }

    setError(null);
    setPendingMonth(month);

    try {
      const rows = await parseBankStatementFileForMonth(file, month);
      setPreview({ month, rows, fileName: file.name });
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(
          caught.issues
            .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
            .join("; "),
        );
      } else {
        setError(caught instanceof Error ? caught.message : "Could not read this bank statement.");
      }
    } finally {
      setPendingMonth(null);
    }
  }, []);

  const confirmPreview = useCallback(() => {
    if (!preview) {
      return;
    }

    setMonthBankStatement(preview.month, serializeTransactionsToCsv(preview.rows));
    setPreview(null);
    setError(null);
  }, [preview]);

  const handleRemove = useCallback((month: string) => {
    setError(null);
    removeMonthBankStatement(month);
  }, []);

  return (
    <>
      <Card className="no-print">
        <CardHeader>
          <Badge variant="info">Bank statements</Badge>
          <CardTitle>Replace ledger data by month</CardTitle>
          <CardDescription>
            Upload a PDF bank statement or CSV in the same column layout as the built-in ledger. Files
            stay in this browser only and replace that month&apos;s rows everywhere in the dashboard.
            You&apos;ll confirm the parsed rows before they are saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="rounded-[1rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            {monthNames.map((month) => {
              const hasUpload = Boolean(uploads[month]?.trim());

              return (
                <div
                  key={month}
                  className="interactive-surface flex flex-col gap-4 rounded-[1.25rem] border border-border/70 bg-background/35 p-4 hover:border-primary/25 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-heading text-base font-semibold">{month}</p>
                    <p className="text-sm text-muted-foreground">
                      {hasUpload
                        ? "Using your uploaded statement for this month."
                        : "Using the built-in ledger for this month."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={(element) => {
                        inputRefs.current[month] = element;
                      }}
                      type="file"
                      accept=".pdf,application/pdf,.csv,text/csv"
                      className="sr-only"
                      aria-label={`Upload PDF or CSV bank statement for ${month}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleFile(month, file);
                        event.target.value = "";
                      }}
                    />
                    <Badge variant={hasUpload ? "positive" : "outline"}>
                      {hasUpload ? "Custom" : "Built-in"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pendingMonth === month}
                      onClick={() => inputRefs.current[month]?.click()}
                    >
                      <FileUp className="size-4" />
                      {pendingMonth === month ? "Reading…" : "Upload PDF"}
                    </Button>
                    {hasUpload ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(month)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            PDFs are read in the browser: extracted text must include the same table as a ledger export
            (Month, Date, Time, Transaction Code, Description, Counterparty, Amount (THB), Direction,
            Category, Running Balance). Dates DD/MM/YYYY; direction IN or OUT.
          </p>
        </CardContent>
      </Card>

      {preview ? (
        <div
          className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-preview-title"
        >
          <div className="interactive-surface max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-[0_24px_80px_rgba(3,6,18,0.55)]">
            <div className="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="import-preview-title" className="font-heading text-lg font-semibold">
                  Review import
                </h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{preview.fileName}</span> ·{" "}
                  {preview.rows.length} rows for {preview.month}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={confirmPreview}>
                  Confirm import
                </Button>
              </div>
            </div>
            <div className="max-h-[min(60vh,28rem)] overflow-auto px-2 pb-4 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatIsoDate(row.isoDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.transactionCode}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{row.description}</TableCell>
                      <TableCell>{row.direction}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.rows.length > PREVIEW_ROW_LIMIT ? (
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                  Showing first {PREVIEW_ROW_LIMIT} rows. All {preview.rows.length} rows will be saved.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
