export type DashboardTab = "overview" | "monthly-pnl" | "transactions" | "categories";

export type UrlDirectionFilter = "all" | "in" | "out";

export interface DashboardUrlState {
  tab: DashboardTab;
  month: string;
  q: string;
  dir: UrlDirectionFilter;
  cat: string;
  /** Second month for period-vs-period compare (only used when `month` is a specific month). */
  compare: string;
}

const TAB_VALUES: DashboardTab[] = ["overview", "monthly-pnl", "transactions", "categories"];

const isDashboardTab = (value: string): value is DashboardTab =>
  TAB_VALUES.includes(value as DashboardTab);

const safeDecodeURIComponent = (value: string, fallback: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
};

export const parseDashboardSearchParams = (searchParams: URLSearchParams): DashboardUrlState => {
  const tabRaw = searchParams.get("tab") ?? "";
  const tab = isDashboardTab(tabRaw) ? tabRaw : "overview";

  const monthRaw = searchParams.get("month");
  const month =
    monthRaw === null || monthRaw === "" ? "all" : safeDecodeURIComponent(monthRaw, "all");

  const q = searchParams.get("q") ?? "";

  const dirRaw = (searchParams.get("dir") ?? "all").toLowerCase();
  const dir: UrlDirectionFilter =
    dirRaw === "in" || dirRaw === "out" ? dirRaw : "all";

  const catRaw = searchParams.get("cat");
  const cat = catRaw === null || catRaw === "" ? "" : safeDecodeURIComponent(catRaw, "");

  const compareRaw = searchParams.get("compare");
  const compare =
    compareRaw === null || compareRaw === "" ? "" : safeDecodeURIComponent(compareRaw, "");

  return { tab, month, q, dir, cat, compare };
};

export const directionToTransaction = (dir: UrlDirectionFilter): "all" | "IN" | "OUT" =>
  dir === "in" ? "IN" : dir === "out" ? "OUT" : "all";

export const transactionToDirection = (value: "all" | "IN" | "OUT"): UrlDirectionFilter =>
  value === "IN" ? "in" : value === "OUT" ? "out" : "all";

interface BuildDashboardUrlOptions {
  pathname: string;
  current: URLSearchParams;
  updates: Partial<DashboardUrlState>;
}

export const buildDashboardUrl = ({ pathname, current, updates }: BuildDashboardUrlOptions): string => {
  const merged: DashboardUrlState = {
    ...parseDashboardSearchParams(current),
    ...updates,
  };

  const next = new URLSearchParams();
  next.set("tab", merged.tab);

  if (merged.month !== "all") {
    next.set("month", encodeURIComponent(merged.month));
  }

  if (merged.q.trim() !== "") {
    next.set("q", merged.q);
  }

  if (merged.dir !== "all") {
    next.set("dir", merged.dir);
  }

  if (merged.cat.trim() !== "") {
    next.set("cat", encodeURIComponent(merged.cat));
  }

  if (merged.compare.trim() !== "") {
    next.set("compare", encodeURIComponent(merged.compare));
  }

  const query = next.toString();

  return query ? `${pathname}?${query}` : pathname;
};
