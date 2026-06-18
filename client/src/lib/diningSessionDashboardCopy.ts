/**
 * TABLE-MANAGEMENT-1 UX-1A — dining session labels for owner Orders dashboard.
 */

type Lang = "ar" | "en";

export function formatDashboardSessionLabel(sessionId: number, language: Lang): string {
  return language === "ar" ? `جلسة #${sessionId}` : `Session #${sessionId}`;
}

/** Shown only when multiple visible orders share the same session. */
export function formatDashboardSessionOrderCount(count: number, language: Lang): string {
  if (language === "ar") {
    if (count === 2) return "طلبان";
    return `${count} طلبات`;
  }
  return count === 1 ? "1 order" : `${count} orders`;
}

export function buildVisibleSessionOrderCounts(
  orders: ReadonlyArray<{ sessionId?: number | null }>
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const order of orders) {
    const sessionId = order.sessionId;
    if (sessionId == null || sessionId <= 0) continue;
    counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1);
  }
  return counts;
}

export function hasDashboardSession(sessionId: number | null | undefined): sessionId is number {
  return sessionId != null && sessionId > 0;
}
