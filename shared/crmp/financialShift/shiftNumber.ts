/**
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — human Shift Number presentation.
 * Allocation is persistence-owned; formatting is pure.
 */

/** Display form — zero-padded, immutable once assigned. */
export function formatHumanShiftNumber(shiftNumber: number): string {
  if (!Number.isInteger(shiftNumber) || shiftNumber < 1) return "—";
  return String(shiftNumber).padStart(6, "0");
}
