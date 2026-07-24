/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 — Register resolution (pure).
 * Never invents a Register. Ambiguity → conflict.
 */

import { CrmpConflictError, CrmpNotFoundError } from "../crmpErrors";
import { isDutyActive } from "./registerLifecycle";
import type { CashRegister } from "./registerContract";

export type ResolveActiveRegisterInput = Readonly<{
  restaurantId: number;
  registers: readonly CashRegister[];
  /** When supplied, resolve that id (must be Duty-active if requiring active). */
  registerId?: string | null;
  requireDutyOpen?: boolean;
}>;

export type ResolveRegisterByDeviceInput = Readonly<{
  restaurantId: number;
  deviceId: string;
  registers: readonly CashRegister[];
}>;

export type ResolveRegisterByOperatorInput = Readonly<{
  restaurantId: number;
  operatorUserId: number;
  registers: readonly CashRegister[];
}>;

/**
 * Active Register for settle / ops:
 * - explicit registerId → that register (catalog active; optionally Duty open)
 * - else exactly one Duty=open Register in restaurant
 * - zero → not found; >1 → conflict
 */
export function resolveActiveRegister(
  input: ResolveActiveRegisterInput
): CashRegister {
  const scoped = input.registers.filter(
    (r) => r.restaurantId === input.restaurantId
  );

  if (input.registerId?.trim()) {
    const hit = scoped.find((r) => r.registerId === input.registerId!.trim());
    if (!hit) {
      throw new CrmpNotFoundError(
        `Register not found: ${input.registerId.trim()}`
      );
    }
    if (input.requireDutyOpen !== false && hit.dutyStatus !== "open") {
      throw new CrmpNotFoundError(
        `Register ${hit.registerId} Duty is not open`
      );
    }
    return hit;
  }

  const openDuty = scoped.filter((r) => r.dutyStatus === "open");
  if (openDuty.length === 0) {
    throw new CrmpNotFoundError(
      `No Duty-open Register for restaurant ${input.restaurantId}`
    );
  }
  if (openDuty.length > 1) {
    throw new CrmpConflictError(
      `Ambiguous Duty-open Registers for restaurant ${input.restaurantId}`
    );
  }
  return openDuty[0]!;
}

export function resolveRegisterByDevice(
  input: ResolveRegisterByDeviceInput
): CashRegister {
  const deviceId = input.deviceId.trim();
  if (!deviceId) {
    throw new CrmpNotFoundError("deviceId required");
  }
  const hits = input.registers.filter(
    (r) =>
      r.restaurantId === input.restaurantId &&
      r.status === "active" &&
      r.deviceId === deviceId
  );
  if (hits.length === 0) {
    throw new CrmpNotFoundError(`No Register for device ${deviceId}`);
  }
  if (hits.length > 1) {
    throw new CrmpConflictError(
      `Ambiguous Registers for device ${deviceId}`
    );
  }
  return hits[0]!;
}

export function resolveRegisterByOperator(
  input: ResolveRegisterByOperatorInput
): CashRegister {
  const hits = input.registers.filter(
    (r) =>
      r.restaurantId === input.restaurantId &&
      isDutyActive(r.dutyStatus) &&
      r.assignedOperatorUserId === input.operatorUserId
  );
  if (hits.length === 0) {
    throw new CrmpNotFoundError(
      `No Duty-active Register for operator ${input.operatorUserId}`
    );
  }
  if (hits.length > 1) {
    throw new CrmpConflictError(
      `Ambiguous Duty-active Registers for operator ${input.operatorUserId}`
    );
  }
  return hits[0]!;
}
