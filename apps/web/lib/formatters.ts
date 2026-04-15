const thaiBahtFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatCurrency = (value: number) => thaiBahtFormatter.format(value);

export const formatCompactCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}฿${compactFormatter.format(Math.abs(value))}`;

export const formatPercent = (value: number) => percentFormatter.format(value);

export const formatSignedCurrency = (value: number) =>
  `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;

export const formatIsoDate = (value: string) => dateFormatter.format(new Date(value));
