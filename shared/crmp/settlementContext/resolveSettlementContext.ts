/**
 * SETTLEMENT-CONTEXT-ADOPTION-1 — pure Settlement Context resolution.
 * Never fabricates Register or Financial Shift. Deterministic; conflict → gap.
 */

import type { CashRegister } from "../register/registerContract";
import { registerDutyAllowsSettlementContext } from "../register/registerLifecycle";
import type { FinancialShift } from "../financialShift/financialShiftContract";
import { isActiveShiftStatus } from "../valueObjects";
import {
  unavailableSettlementContext,
  type SettlementContext,
  type SettlementContextHints,
} from "./settlementContextContract";

export type SettlementContextResolutionInput = Readonly<{
  restaurantId: number;
  resolvedAt: string;
  hints: SettlementContextHints;
  /** Restaurant registers (Catalog plane). */
  registers: readonly CashRegister[];
  /**
   * Active shift for the candidate register (when register known).
   * Caller loads via findActiveByRegister — never invent.
   */
  activeShiftOnRegister: FinancialShift | null;
  /**
   * Active shifts for hinted operator (when used for register discovery).
   * Caller loads via findActiveByOperator — never invent.
   */
  activeShiftsForOperator: readonly FinancialShift[];
}>;

function classifyStatus(ctx: Omit<SettlementContext, "status">): SettlementContext["status"] {
  if (ctx.registerId && ctx.financialShiftId && ctx.operatorUserId != null) {
    return "resolved";
  }
  if (
    ctx.registerId ||
    ctx.financialShiftId ||
    ctx.operatorUserId != null ||
    ctx.deviceId ||
    ctx.operationalScreenId
  ) {
    return "partial";
  }
  return "unavailable";
}

/**
 * Pure resolution from already-loaded CRMP facts + hints.
 * Does not create Register/Shift. Does not call Settlement/Check.
 */
export function resolveSettlementContextFromFacts(
  input: SettlementContextResolutionInput
): SettlementContext {
  const gaps: string[] = [];
  const hints = input.hints;
  const operationalScreenId = hints.operationalScreenId?.trim() || null;
  let deviceId = hints.deviceId?.trim() || null;
  let registerId: string | null = null;
  let financialShiftId: string | null = null;
  let operatorUserId: number | null =
    hints.operatorUserId != null &&
    Number.isInteger(hints.operatorUserId) &&
    hints.operatorUserId > 0
      ? hints.operatorUserId
      : null;

  const registers = input.registers.filter(
    (r) => r.restaurantId === input.restaurantId
  );

  // 1) Explicit registerId
  const hintedRegisterId = hints.registerId?.trim();
  if (hintedRegisterId) {
    const hit = registers.find((r) => r.registerId === hintedRegisterId);
    if (!hit) {
      gaps.push("register_not_found");
    } else if (hit.status !== "active") {
      gaps.push("register_not_active");
      registerId = hit.registerId;
      if (hit.deviceId) deviceId = deviceId ?? hit.deviceId;
    } else if (!registerDutyAllowsSettlementContext(hit.dutyStatus)) {
      // Closed Duty cannot accept settlements (ADR-030 / ROP).
      gaps.push("register_duty_closed");
      registerId = hit.registerId;
      if (hit.deviceId) deviceId = deviceId ?? hit.deviceId;
    } else {
      registerId = hit.registerId;
      if (hit.deviceId) deviceId = deviceId ?? hit.deviceId;
    }
  }

  // 2) Device → Register (only when register not already chosen)
  if (!registerId && deviceId) {
    const byDevice = registers.filter((r) => r.deviceId === deviceId);
    if (byDevice.length === 0) {
      gaps.push("register_not_found_for_device");
    } else if (byDevice.length > 1) {
      gaps.push("ambiguous_register_for_device");
    } else {
      const hit = byDevice[0]!;
      if (hit.status !== "active") {
        gaps.push("register_not_active");
      } else if (!registerDutyAllowsSettlementContext(hit.dutyStatus)) {
        gaps.push("register_duty_closed");
      }
      registerId = hit.registerId;
    }
  }

  // 3) Operator → active Shift → Register (only when register still unknown)
  if (!registerId && operatorUserId != null) {
    const opShifts = input.activeShiftsForOperator.filter(
      (s) =>
        s.restaurantId === input.restaurantId &&
        s.operatorUserId === operatorUserId &&
        isActiveShiftStatus(s.status)
    );
    if (opShifts.length === 0) {
      gaps.push("no_active_shift_for_operator");
    } else if (opShifts.length > 1) {
      gaps.push("ambiguous_shift_for_operator");
    } else {
      registerId = opShifts[0]!.registerId;
      financialShiftId = opShifts[0]!.financialShiftId;
    }
  }

  // 4) Active shift on resolved register
  if (registerId && !financialShiftId) {
    const shift = input.activeShiftOnRegister;
    if (
      !shift ||
      shift.registerId !== registerId ||
      shift.restaurantId !== input.restaurantId ||
      !isActiveShiftStatus(shift.status)
    ) {
      gaps.push("no_active_shift");
    } else {
      financialShiftId = shift.financialShiftId;
      if (operatorUserId == null) {
        operatorUserId = shift.operatorUserId;
      }
    }
  }

  // Never invent when no hints and no facts
  if (!registerId && !financialShiftId && operatorUserId == null && !deviceId) {
    return unavailableSettlementContext(input.restaurantId, input.resolvedAt, [
      "no_operational_hints",
      ...gaps,
    ]);
  }

  const base = {
    restaurantId: input.restaurantId,
    registerId,
    financialShiftId,
    operatorUserId,
    deviceId,
    operationalScreenId,
    resolvedAt: input.resolvedAt,
    gaps,
  };

  return {
    ...base,
    status: classifyStatus(base),
  };
}
