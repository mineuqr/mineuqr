/**
 * ADR-ARCH-030 — Financial Shift resolution policies (pure).
 * Never invents a Shift.
 */

import { CrmpConflictError } from "../crmpErrors";
import { isActiveShiftStatus } from "../valueObjects";
import type { FinancialShift } from "./financialShiftContract";

export function resolveActiveFinancialShift(
  candidates: readonly FinancialShift[]
): FinancialShift | null {
  const active = candidates.filter((s) => isActiveShiftStatus(s.status));
  if (active.length === 0) return null;
  if (active.length > 1) {
    throw new CrmpConflictError(
      "Multiple active Financial Shifts for Register — invariant violation"
    );
  }
  return active[0] ?? null;
}

export function resolveFinancialShiftByRegister(
  shifts: readonly FinancialShift[],
  registerId: string,
  options?: { includeClosed?: boolean }
): FinancialShift | null {
  const scoped = shifts.filter((s) => s.registerId === registerId);
  if (options?.includeClosed) {
    const active = resolveActiveFinancialShift(scoped);
    if (active) return active;
    const historical = [...scoped]
      .filter((s) => s.status === "closed" || s.status === "archived")
      .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
    return historical[0] ?? null;
  }
  return resolveActiveFinancialShift(scoped);
}

export function resolveFinancialShiftByOperator(
  shifts: readonly FinancialShift[],
  operatorUserId: number
): FinancialShift | null {
  const active = shifts.filter(
    (s) =>
      isActiveShiftStatus(s.status) && s.operatorUserId === operatorUserId
  );
  if (active.length === 0) return null;
  if (active.length > 1) {
    throw new CrmpConflictError(
      "Operator has multiple active Financial Shifts — conflict"
    );
  }
  return active[0] ?? null;
}
