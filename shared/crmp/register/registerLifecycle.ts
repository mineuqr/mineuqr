/**
 * CRMP-IMPLEMENTATION-1 — Register lifecycle (D-INV-01).
 */

import { CrmpInvalidTransitionError } from "../crmpErrors";
import type { RegisterStatus } from "../valueObjects";

const ALLOWED: Record<RegisterStatus, readonly RegisterStatus[]> = {
  provisioned: ["active"],
  active: ["inactive"],
  inactive: ["active"],
};

export function isRegisterTransitionAllowed(
  from: RegisterStatus,
  to: RegisterStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertRegisterTransition(
  from: RegisterStatus,
  to: RegisterStatus
): void {
  if (!isRegisterTransitionAllowed(from, to)) {
    throw new CrmpInvalidTransitionError(
      `Register cannot transition ${from} → ${to}`
    );
  }
}

export function canHostFinancialShift(status: RegisterStatus): boolean {
  return status === "active";
}
