export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatSignedCurrency = (value: number): string => {
  if (value === 0) {
    return formatCurrency(0);
  }

  return `${value > 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
};

export const formatCompactCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatPercent = (
  value: number,
  maximumFractionDigits = 1,
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
};

export const formatShortMonth = (label: string): string => {
  return label.split(" ")[0].slice(0, 3);
};

export const buildDeltaLabel = (
  current: number,
  previous: number | null,
  suffix = "",
): string => {
  if (previous === null || previous === 0) {
    return "No prior month";
  }

  const delta = current - previous;
  const share = Math.abs(delta / previous);
  const direction = delta >= 0 ? "up" : "down";

  return `${direction} ${formatPercent(share)}${suffix}`;
};

export const buildTrendLabel = (
  first: number,
  last: number,
  direction: "up" | "down",
): string => {
  if (first === 0 && last === 0) {
    return "Stable";
  }

  const isImproving = direction === "up" ? last >= first : last <= first;

  return isImproving ? "Improving" : "Deteriorating";
};
