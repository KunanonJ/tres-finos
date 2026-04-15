export const BANK_STATEMENTS_STORAGE_KEY = "tres-finos-bank-statements-v1";

export const BANK_STATEMENTS_CHANGE_EVENT = "tres-finos-bank-statements-change";

export const loadBankStatements = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(BANK_STATEMENTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, string>;
  } catch {
    return {};
  }
};

export const loadBankStatementsSnapshot = (): string => JSON.stringify(loadBankStatements());

/** Parses a snapshot string from {@link loadBankStatementsSnapshot} (or localStorage JSON). Never throws. */
export const parseBankStatementsSnapshot = (snapshot: string): Record<string, string> => {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, string>;
  } catch {
    return {};
  }
};

export const subscribeBankStatements = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener(BANK_STATEMENTS_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(BANK_STATEMENTS_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

const persist = (data: Record<string, string>) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BANK_STATEMENTS_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(BANK_STATEMENTS_CHANGE_EVENT));
};

export const saveBankStatements = (data: Record<string, string>) => {
  persist(data);
};

export const setMonthBankStatement = (month: string, csv: string) => {
  const next = { ...loadBankStatements(), [month]: csv };
  persist(next);
};

export const removeMonthBankStatement = (month: string) => {
  const next = { ...loadBankStatements() };
  delete next[month];
  persist(next);
};
