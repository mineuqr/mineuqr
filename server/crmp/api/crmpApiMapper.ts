/**
 * CRMP-OPERATIONS-API-1 / FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 —
 * domain → operational DTO mapping.
 * No business rules. No event leakage.
 */

import type { CashRegister, DrawerMovement, FinancialShift } from "@shared/crmp";
import { CrmpInvariantError } from "@shared/crmp";
import type {
  DrawerMovementCommandResultDto,
  DrawerMovementDto,
  FinancialShiftCommandResultDto,
  FinancialShiftRefDto,
  FinancialShiftViewDto,
  RegisterCommandResultDto,
  RegisterDto,
} from "./crmpApiDtos";

export function toRegisterDto(register: CashRegister): RegisterDto {
  return {
    registerId: register.registerId,
    restaurantId: register.restaurantId,
    code: register.code,
    displayName: register.displayName,
    registerType: register.registerType,
    catalogStatus: register.status,
    dutyStatus: register.dutyStatus,
    archivedAt: register.archivedAt,
    deviceId: register.deviceId,
    assignedOperatorUserId: register.assignedOperatorUserId,
    operatorAssignedAt: register.operatorAssignedAt,
    version: register.version,
    updatedAt: register.updatedAt,
  };
}

export function toRegisterCommandResultDto(result: {
  register: CashRegister;
  alreadyApplied?: boolean;
}): RegisterCommandResultDto {
  return {
    register: toRegisterDto(result.register),
    alreadyApplied: result.alreadyApplied === true,
  };
}

export function toFinancialShiftRefDto(
  shift: FinancialShift
): FinancialShiftRefDto {
  return {
    financialShiftId: shift.financialShiftId,
    shiftNumber: shift.shiftNumber,
    registerId: shift.registerId,
    restaurantId: shift.restaurantId,
    status: shift.status,
    operatorUserId: shift.operatorUserId,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    archivedAt: shift.archivedAt,
    version: shift.version,
  };
}

export function toFinancialShiftViewDto(
  shift: FinancialShift,
  expectedCashAmount: string
): FinancialShiftViewDto {
  const final =
    [...shift.drawer.counts].reverse().find((c) => c.kind === "final") ?? null;
  return {
    financialShiftId: shift.financialShiftId,
    shiftNumber: shift.shiftNumber,
    registerId: shift.registerId,
    restaurantId: shift.restaurantId,
    status: shift.status,
    operatorUserId: shift.operatorUserId,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    archivedAt: shift.archivedAt,
    version: shift.version,
    openingFloatAmount: shift.openingFloatAmount,
    currencyCode: shift.currencyCode,
    expectedCashAmount,
    finalCount: final
      ? {
          expectedAmount: final.expectedAmount,
          actualAmount: final.actualAmount,
          varianceAmount: final.varianceAmount,
        }
      : null,
  };
}

export function toFinancialShiftCommandResultDto(input: {
  shift: FinancialShift;
  expectedCashAmount: string;
  alreadyApplied?: boolean;
}): FinancialShiftCommandResultDto {
  return {
    shift: toFinancialShiftViewDto(input.shift, input.expectedCashAmount),
    alreadyApplied: input.alreadyApplied === true,
  };
}

export function toDrawerMovementDto(movement: DrawerMovement): DrawerMovementDto {
  if (movement.movementType === "opening_float") {
    throw new CrmpInvariantError("opening_float is not a public drawer movement");
  }
  return {
    movementId: movement.movementId,
    movementType: movement.movementType,
    amount: movement.amount,
    currencyCode: movement.currencyCode,
    reason: movement.reason,
    actorUserId: movement.actorUserId,
    recordedAt: movement.recordedAt,
  };
}

export function toDrawerMovementCommandResultDto(input: {
  shift: FinancialShift;
  movement: DrawerMovement;
  expectedCashAmount: string;
  alreadyApplied?: boolean;
}): DrawerMovementCommandResultDto {
  return {
    shift: toFinancialShiftViewDto(input.shift, input.expectedCashAmount),
    movement: toDrawerMovementDto(input.movement),
    alreadyApplied: input.alreadyApplied === true,
  };
}
