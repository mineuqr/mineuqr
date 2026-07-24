/**
 * CRMP-IMPLEMENTATION-1 — expected cash formula (D-INV-14).
 *
 * expectedCash =
 *   OpeningFloat
 *   + paid_in − paid_out − safe_drop + manual_adjustment
 *   + Σ attributed cash tender amounts
 *
 * Never uses Order totals or open Checks.
 */

import type { FinancialShift } from "./financialShiftContract";
import {
  addAmounts,
  fromCents,
  normalizeAmount,
  toCents,
} from "../valueObjects";

export function computeExpectedCash(shift: FinancialShift): string {
  let cents = toCents(shift.openingFloatAmount);

  for (const m of shift.drawer.movements) {
    if (m.movementType === "opening_float") continue; // already in openingFloatAmount
    const c = toCents(m.amount);
    if (m.movementType === "paid_in") cents += c;
    else if (m.movementType === "paid_out" || m.movementType === "safe_drop")
      cents -= c;
    else if (m.movementType === "manual_adjustment") cents += c; // signed amount
  }

  for (const a of shift.attributions) {
    cents += toCents(a.cashTenderAmount);
  }

  return normalizeAmount(fromCents(cents));
}

export function sumAttributedCash(shift: FinancialShift): string {
  return addAmounts(
    "0.00",
    ...shift.attributions.map((a) => a.cashTenderAmount)
  );
}
