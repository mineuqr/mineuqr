/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * Presentation navigation helpers. URL remains Dashboard SSOT.
 */

import { buildDashboardPath } from "@/lib/dashboardUrl";

export function cashierWorkspacePath(restaurantId: number): string {
  return buildDashboardPath({ restaurantId, section: "cashier" });
}

export function cashierDashboardHomePath(restaurantId: number): string {
  return buildDashboardPath({ restaurantId, section: "home" });
}

/** Optional convenience. Returns false when the browser blocks the tab. */
export function tryOpenCashierNewTab(restaurantId: number): boolean {
  if (typeof window === "undefined" || typeof window.open !== "function") {
    return false;
  }
  try {
    const opened = window.open(
      cashierWorkspacePath(restaurantId),
      "_blank",
      "noopener,noreferrer"
    );
    return opened != null;
  } catch {
    return false;
  }
}
