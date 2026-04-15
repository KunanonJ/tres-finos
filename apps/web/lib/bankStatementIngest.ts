import { parseCsvToTransactions, serializeTransactionsToCsv } from "@/lib/dashboardEngine";
import { extractTextFromPdfFile } from "@/lib/pdfText";
import type { DashboardTransaction } from "@/types/dashboard";

const isPdfFile = (file: File) =>
  file.type === "application/pdf" ||
  file.type === "application/x-pdf" ||
  file.name.toLowerCase().endsWith(".pdf");

const extractLedgerCsvBlock = (text: string): string => {
  const match = text.match(/Month\s*,\s*Date\s*,\s*Time/i);
  if (!match || match.index === undefined) {
    throw new Error('Missing ledger header row starting with "Month,Date,Time".');
  }

  return text.slice(match.index).trim();
};

const tryParseLedgerFromText = (raw: string) => {
  const attempts: (() => string)[] = [
    () => raw.replace(/^\uFEFF/, "").trim(),
    () => extractLedgerCsvBlock(raw.replace(/^\uFEFF/, "").trim()),
  ];

  let lastError: unknown;
  for (const get of attempts) {
    try {
      const text = get();
      if (!text) {
        continue;
      }

      return parseCsvToTransactions(text);
    } catch (error) {
      lastError = error;
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "The table could not be parsed as ledger CSV.";

  throw new Error(
    `${detail} For PDFs, the document text must still contain the same columns as the ledger export (Month, Date, Time, …).`,
  );
};

/**
 * Parses a PDF or CSV into transactions for the expected ledger month (throws if invalid).
 */
export const parseBankStatementFileForMonth = async (
  file: File,
  expectedMonth: string,
): Promise<DashboardTransaction[]> => {
  const text = isPdfFile(file) ? await extractTextFromPdfFile(file) : await file.text();
  const rows = tryParseLedgerFromText(text);

  if (rows.length === 0) {
    throw new Error("Add at least one transaction row below the header.");
  }

  const wrongMonth = rows.filter((row) => row.month !== expectedMonth);

  if (wrongMonth.length > 0) {
    const found = [...new Set(wrongMonth.map((row) => row.month))].join(", ");
    throw new Error(`The Month column must be "${expectedMonth}" for every row. Found: ${found}.`);
  }

  return rows;
};

/**
 * Reads a bank statement PDF or CSV, validates rows for the selected month,
 * and returns canonical CSV for localStorage (same pipeline as manual CSV upload).
 */
export const ingestBankStatementFile = async (file: File, expectedMonth: string): Promise<string> => {
  const rows = await parseBankStatementFileForMonth(file, expectedMonth);
  return serializeTransactionsToCsv(rows);
};
