/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — refund window display helpers.
 */

import type { SettlementRecordLang } from "./settlementRecordCopy";

/** Format elapsed refund window duration for operator display. */
export function formatElapsedRefundWindow(
  elapsedMs: number,
  language: SettlementRecordLang
): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return language === "ar" ? "—" : "—";
  }
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (language === "ar") {
    if (hours <= 0) return `${minutes} دقيقة`;
    return `${hours} ساعة و ${minutes} دقيقة`;
  }
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
