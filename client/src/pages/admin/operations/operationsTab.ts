/** ADMIN-DASHBOARD-REBUILD-3A — operations workspace tab ids and URL sync. */

export const OPERATIONS_TABS = ["accounts", "tenants", "communications"] as const;

export type OperationsTab = (typeof OPERATIONS_TABS)[number];

export const DEFAULT_OPERATIONS_TAB: OperationsTab = "accounts";

export function isOperationsTab(value: string | null | undefined): value is OperationsTab {
  return OPERATIONS_TABS.includes(value as OperationsTab);
}

/** Parse `?tab=` from wouter `useSearch()` (may include leading `?`). */
export function parseOperationsTab(search: string): OperationsTab {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const tab = new URLSearchParams(raw).get("tab");
  return isOperationsTab(tab) ? tab : DEFAULT_OPERATIONS_TAB;
}

export function operationsTabHref(tab: OperationsTab): string {
  return `/admin/operations?tab=${tab}`;
}
