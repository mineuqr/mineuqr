/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 — Register catalog + Duty lifecycle.
 */

import { CrmpInvalidTransitionError, CrmpInvariantError } from "../crmpErrors";
import type { RegisterDutyStatus, RegisterStatus } from "../valueObjects";
import type { CashRegister } from "./registerContract";

const CATALOG_ALLOWED: Record<RegisterStatus, readonly RegisterStatus[]> = {
  provisioned: ["active"],
  active: ["inactive"],
  inactive: ["active"],
};

/**
 * closed → open ⇄ suspended
 *         ↓
 *       closed
 */
const DUTY_ALLOWED: Record<RegisterDutyStatus, readonly RegisterDutyStatus[]> = {
  closed: ["open"],
  open: ["suspended", "closed"],
  suspended: ["open", "closed"],
};

export function isRegisterTransitionAllowed(
  from: RegisterStatus,
  to: RegisterStatus
): boolean {
  if (from === to) return true;
  return CATALOG_ALLOWED[from].includes(to);
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

export function isRegisterDutyTransitionAllowed(
  from: RegisterDutyStatus,
  to: RegisterDutyStatus
): boolean {
  if (from === to) return true;
  return DUTY_ALLOWED[from].includes(to);
}

export function assertRegisterDutyTransition(
  from: RegisterDutyStatus,
  to: RegisterDutyStatus
): void {
  if (!isRegisterDutyTransitionAllowed(from, to)) {
    throw new CrmpInvalidTransitionError(
      `Register Duty cannot transition ${from} → ${to}`
    );
  }
}

/** Duty mutations require Catalog = active. */
export function assertCatalogAllowsDuty(register: CashRegister): void {
  if (register.status !== "active") {
    throw new CrmpInvariantError(
      `Register catalog status ${register.status} cannot enter or change Duty`
    );
  }
}

/**
 * Financial Shift may open only when Catalog=active and Duty=open.
 * Suspended / closed Duty cannot host a new Shift.
 */
export function canHostFinancialShift(register: CashRegister): boolean {
  return register.status === "active" && register.dutyStatus === "open";
}

/** Settlements may use Register context when Duty is not closed (open or suspended). */
export function registerDutyAllowsSettlementContext(
  dutyStatus: RegisterDutyStatus
): boolean {
  return dutyStatus === "open" || dutyStatus === "suspended";
}

export function isDutyActive(dutyStatus: RegisterDutyStatus): boolean {
  return dutyStatus === "open" || dutyStatus === "suspended";
}
