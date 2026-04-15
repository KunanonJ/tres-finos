import { z } from "zod";

import { loadBankStatements, saveBankStatements } from "@/lib/bankStatementStorage";

export const LEDGER_BACKUP_VERSION = 1 as const;

const backupSchema = z.object({
  version: z.literal(LEDGER_BACKUP_VERSION),
  exportedAt: z.string(),
  bankStatements: z.record(z.string()),
});

export type LedgerBackupFile = z.infer<typeof backupSchema>;

export const buildLedgerBackupFile = (): LedgerBackupFile => ({
  version: LEDGER_BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  bankStatements: loadBankStatements(),
});

export const downloadLedgerBackup = () => {
  const payload = buildLedgerBackupFile();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tres-finos-ledger-backup-${payload.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const restoreLedgerBackupFromText = (text: string): void => {
  const parsed: unknown = JSON.parse(text);
  const data = backupSchema.parse(parsed);
  saveBankStatements(data.bankStatements);
};
