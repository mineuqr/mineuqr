/** Navigation entry type for post-submission guard (CUSTOMER-CHECKOUT-UX-1C). */
export type NavigationEntryType = "navigate" | "reload" | "back_forward" | "unknown";

export function getNavigationEntryType(): NavigationEntryType {
  if (typeof performance === "undefined") return "unknown";
  const [entry] = performance.getEntriesByType(
    "navigation"
  ) as PerformanceNavigationTiming[];
  const type = entry?.type;
  if (type === "navigate" || type === "reload" || type === "back_forward") {
    return type;
  }
  return "unknown";
}
