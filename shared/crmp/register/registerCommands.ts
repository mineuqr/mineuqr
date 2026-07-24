/**
 * CRMP-IMPLEMENTATION-1 — Register domain commands (pure).
 */

import {
  CrmpImmutabilityError,
  CrmpInvariantError,
  CrmpValidationError,
} from "../crmpErrors";
import type { CashRegister } from "./registerContract";
import {
  assertRegisterTransition,
  canHostFinancialShift,
} from "./registerLifecycle";

export type ProvisionRegisterCommand = Readonly<{
  registerId: string;
  restaurantId: number;
  displayName: string;
  createdAt: string;
}>;

export type ActivateRegisterCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

export type DeactivateRegisterCommand = Readonly<{
  register: CashRegister;
  hasActiveShift: boolean;
  at: string;
}>;

export type BindDeviceCommand = Readonly<{
  register: CashRegister;
  deviceId: string;
  at: string;
}>;

export type UnbindDeviceCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

function bump(register: CashRegister, at: string): Pick<
  CashRegister,
  "version" | "updatedAt"
> {
  return { version: register.version + 1, updatedAt: at };
}

export function provisionRegister(
  command: ProvisionRegisterCommand
): CashRegister {
  if (!Number.isInteger(command.restaurantId) || command.restaurantId <= 0) {
    throw new CrmpValidationError("restaurantId must be a positive integer");
  }
  if (!command.registerId.trim()) {
    throw new CrmpValidationError("registerId required");
  }
  if (!command.displayName.trim()) {
    throw new CrmpValidationError("displayName required");
  }
  return {
    registerId: command.registerId,
    restaurantId: command.restaurantId,
    displayName: command.displayName.trim(),
    status: "provisioned",
    deviceId: null,
    version: 1,
    createdAt: command.createdAt,
    updatedAt: command.createdAt,
  };
}

export function activateRegister(
  command: ActivateRegisterCommand
): CashRegister {
  assertRegisterTransition(command.register.status, "active");
  if (command.register.status === "active") return command.register;
  return {
    ...command.register,
    status: "active",
    ...bump(command.register, command.at),
  };
}

export function deactivateRegister(
  command: DeactivateRegisterCommand
): CashRegister {
  // D-INV-05 — cannot deactivate while active shift exists.
  if (command.hasActiveShift) {
    throw new CrmpInvariantError(
      "Register cannot deactivate while a Financial Shift is active"
    );
  }
  assertRegisterTransition(command.register.status, "inactive");
  if (command.register.status === "inactive") return command.register;
  return {
    ...command.register,
    status: "inactive",
    ...bump(command.register, command.at),
  };
}

export function bindDevice(command: BindDeviceCommand): CashRegister {
  if (!command.deviceId.trim()) {
    throw new CrmpValidationError("deviceId required");
  }
  return {
    ...command.register,
    deviceId: command.deviceId.trim(),
    ...bump(command.register, command.at),
  };
}

export function unbindDevice(command: UnbindDeviceCommand): CashRegister {
  return {
    ...command.register,
    deviceId: null,
    ...bump(command.register, command.at),
  };
}

/** Guard used by OpenFinancialShift coordination. */
export function assertRegisterCanOpenShift(register: CashRegister): void {
  if (!canHostFinancialShift(register.status)) {
    throw new CrmpInvariantError(
      `Register status ${register.status} cannot host a Financial Shift`
    );
  }
}

export function assertRegisterNotMutatingMoney(): void {
  throw new CrmpImmutabilityError(
    "Register must never own or mutate Settlement money"
  );
}
