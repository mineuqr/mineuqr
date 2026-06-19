import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import type { RouterOutputs } from "@/lib/trpc";

export type ActiveTableRow = RouterOutputs["ops"]["getActiveTablesBoard"]["tables"][number];
export type OrderRow = RouterOutputs["order"]["list"][number];

export type SessionStatusFilter = "all" | Extract<DiningSessionStatus, "open" | "paid" | "complimentary">;

export type TableOperationalStatus =
  | Extract<DiningSessionStatus, "open" | "paid" | "complimentary">
  | "available";

export type OperationalSessionRow = ActiveTableRow & {
  sessionStatus: Extract<DiningSessionStatus, "open" | "paid" | "complimentary">;
  tableNumber?: number;
};

/** Full restaurant table row with derived session state for board UIs. */
export type OperationalTableRow = ActiveTableRow & {
  sessionStatus: TableOperationalStatus;
  tableNumber?: number;
};

export type SessionStatusMetrics = {
  open: number;
  paid: number;
  complimentary: number;
};

export function buildSessionTableNumbers(orders: OrderRow[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const order of orders) {
    const sessionId = order.sessionId;
    if (sessionId == null || sessionId <= 0 || order.tableNumber == null) continue;
    map.set(sessionId, order.tableNumber);
  }
  return map;
}

/** Active board rows are operationally open sessions (session list helpers). */
export function buildOperationalSessionRows(
  tables: ActiveTableRow[],
  tableNumbersBySession: Map<number, number>
): OperationalSessionRow[] {
  return buildOperationalTableRows(tables, tableNumbersBySession)
    .filter((table) => table.sessionStatus === "open" && table.sessionId)
    .map((table) => ({
      ...table,
      sessionStatus: "open" as const,
    }));
}

/** All restaurant tables with session-aware operational status. */
export function buildOperationalTableRows(
  tables: ActiveTableRow[],
  tableNumbersBySession: Map<number, number>
): OperationalTableRow[] {
  return tables.map((table) => {
    const sessionId =
      table.sessionId != null ? Number.parseInt(table.sessionId, 10) : null;
    const sessionStatus: TableOperationalStatus =
      table.status === "occupied" && table.sessionId ? "open" : "available";

    return {
      ...table,
      sessionStatus,
      tableNumber:
        sessionId != null && Number.isFinite(sessionId)
          ? tableNumbersBySession.get(sessionId)
          : undefined,
    };
  });
}

export function matchesTableSearch(row: OperationalTableRow, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const needle = trimmed.toLowerCase();
  const sessionId = row.sessionId ?? "";

  if (sessionId.toLowerCase().includes(needle)) return true;
  if (row.tableName.toLowerCase().includes(needle)) return true;

  if (row.tableNumber != null) {
    if (String(row.tableNumber).includes(trimmed)) return true;
  }

  const defaultTableMatch = row.tableName.match(/^Table\s+(\d+)$/i);
  if (defaultTableMatch && defaultTableMatch[1].includes(trimmed)) return true;

  return false;
}

export function matchesSessionSearch(row: OperationalSessionRow, query: string): boolean {
  return matchesTableSearch(row, query);
}

export function matchesTableStatusFilter(
  row: OperationalTableRow,
  filter: SessionStatusFilter
): boolean {
  if (filter === "all") return true;
  if (row.sessionStatus === "available") return false;
  return row.sessionStatus === filter;
}

export function matchesStatusFilter(
  row: OperationalSessionRow,
  filter: SessionStatusFilter
): boolean {
  return matchesTableStatusFilter(row, filter);
}

export function computeTableStatusMetrics(rows: OperationalTableRow[]): SessionStatusMetrics {
  return {
    open: rows.filter((row) => row.sessionStatus === "open").length,
    paid: rows.filter((row) => row.sessionStatus === "paid").length,
    complimentary: rows.filter((row) => row.sessionStatus === "complimentary").length,
  };
}

export function computeSessionStatusMetrics(rows: OperationalSessionRow[]): SessionStatusMetrics {
  return computeTableStatusMetrics(rows);
}

export function resolveBoardFilterEmptyMessage(
  isAr: boolean,
  opts: {
    hasAnyTables: boolean;
    searchQuery: string;
    statusFilter: SessionStatusFilter;
    filteredCount: number;
  }
): string | null {
  if (!opts.hasAnyTables) {
    return isAr ? "لا توجد طاولات نشطة لعرضها" : "No active tables to display";
  }
  if (opts.filteredCount > 0) return null;

  if (opts.searchQuery.trim()) {
    return isAr ? "لا توجد طاولات مطابقة لبحثك" : "No tables match your search";
  }

  switch (opts.statusFilter) {
    case "paid":
      return isAr ? "لا توجد جلسات مدفوعة" : "No paid sessions";
    case "complimentary":
      return isAr ? "لا توجد جلسات ضيافة" : "No complimentary sessions";
    case "open":
      return isAr ? "لا توجد جلسات مفتوحة" : "No open sessions";
    default:
      return null;
  }
}

export function resolveSessionListEmptyMessage(
  isAr: boolean,
  opts: {
    hasAnySessions: boolean;
    searchQuery: string;
    statusFilter: SessionStatusFilter;
    filteredCount: number;
  }
): string | null {
  if (!opts.hasAnySessions) {
    return isAr ? "لا توجد جلسات نشطة" : "No active sessions";
  }
  if (opts.filteredCount > 0) return null;

  if (opts.searchQuery.trim()) {
    return isAr ? "لا توجد جلسات مطابقة لبحثك" : "No sessions match your search";
  }

  switch (opts.statusFilter) {
    case "paid":
      return isAr ? "لا توجد جلسات مدفوعة" : "No paid sessions";
    case "complimentary":
      return isAr ? "لا توجد جلسات ضيافة" : "No complimentary sessions";
    case "open":
      return isAr ? "لا توجد جلسات مفتوحة" : "No open sessions";
    default:
      return isAr ? "لا توجد جلسات نشطة" : "No active sessions";
  }
}

export function sessionStatusFilterLabel(filter: SessionStatusFilter, isAr: boolean): string {
  const labels: Record<SessionStatusFilter, { en: string; ar: string }> = {
    all: { en: "All Active", ar: "كل النشطة" },
    open: { en: "Open", ar: "مفتوحة" },
    paid: { en: "Paid", ar: "مدفوعة" },
    complimentary: { en: "Complimentary", ar: "ضيافة" },
  };
  return isAr ? labels[filter].ar : labels[filter].en;
}

export function sessionStatusMetricLabel(
  metric: keyof SessionStatusMetrics,
  isAr: boolean
): string {
  const labels: Record<keyof SessionStatusMetrics, { en: string; ar: string }> = {
    open: { en: "Open Sessions", ar: "جلسات مفتوحة" },
    paid: { en: "Paid Sessions", ar: "جلسات مدفوعة" },
    complimentary: { en: "Complimentary Sessions", ar: "جلسات ضيافة" },
  };
  return isAr ? labels[metric].ar : labels[metric].en;
}

export function tableStatusDisplayLabel(
  status: TableOperationalStatus,
  isAr: boolean
): string {
  if (status === "available") {
    return isAr ? "متاحة" : "Available";
  }
  return sessionStatusDisplayLabel(status, isAr);
}

export function sessionStatusDisplayLabel(
  status: Extract<DiningSessionStatus, "open" | "paid" | "complimentary">,
  isAr: boolean
): string {
  const labels: Record<OperationalSessionRow["sessionStatus"], { en: string; ar: string }> = {
    open: { en: "Open", ar: "مفتوحة" },
    paid: { en: "Paid", ar: "مدفوعة" },
    complimentary: { en: "Complimentary", ar: "ضيافة" },
  };
  return isAr ? labels[status].ar : labels[status].en;
}

export function parseOrderAmount(totalAmount: string | number | null | undefined): number {
  return Number.parseFloat(String(totalAmount ?? "0")) || 0;
}

export function buildSessionOrderTotals(
  orders: OrderRow[],
  activeSessionIds: number[]
): Map<number, number> {
  const allowed = new Set(activeSessionIds);
  const map = new Map<number, number>();
  for (const order of orders) {
    const sessionId = order.sessionId;
    if (sessionId == null || !allowed.has(sessionId)) continue;
    map.set(sessionId, (map.get(sessionId) ?? 0) + parseOrderAmount(order.totalAmount));
  }
  return map;
}

export function homeActiveSessionsEmptyMessage(isAr: boolean): string {
  return isAr ? "لا توجد جلسات نشطة حالياً" : "No active sessions right now";
}
