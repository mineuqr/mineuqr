/**
 * CRMP-OPERATIONS-API-1 — domain → operational DTO mapping.
 * No business rules. No event leakage.
 */

import type { CashRegister, FinancialShift } from "@shared/crmp";
import type {
  FinancialShiftRefDto,
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
    registerId: shift.registerId,
    restaurantId: shift.restaurantId,
    status: shift.status,
    operatorUserId: shift.operatorUserId,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    version: shift.version,
  };
}
