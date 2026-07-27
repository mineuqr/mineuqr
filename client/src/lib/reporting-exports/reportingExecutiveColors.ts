/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-2 — Executive category color tokens (presentation).
 * Charts and cards share these families. No financial meaning.
 */

export type ReportingExecutiveCategory =
  | "cash"
  | "card"
  | "refund"
  | "tax"
  | "orders"
  | "net"
  | "neutral";

export const REPORTING_CATEGORY_HEX = Object.freeze({
  cash: "#34d399",
  card: "#38bdf8",
  refund: "#fb7185",
  tax: "#a78bfa",
  orders: "#fb923c",
  net: "#2dd4bf",
  neutral: "#94a3b8",
} as const satisfies Record<ReportingExecutiveCategory, string>);

export function reportingCategoryFill(
  category: ReportingExecutiveCategory,
  alpha = 0.22
): string {
  const hex = REPORTING_CATEGORY_HEX[category];
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
