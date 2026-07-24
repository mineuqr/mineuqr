/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 /
 * REGISTER-CATALOG-MANAGEMENT-1 — Register domain commands (pure).
 * Catalog + Duty + operator + device. Never mutates Settlement money.
 */

import {
  CrmpConflictError,
  CrmpImmutabilityError,
  CrmpInvariantError,
  CrmpValidationError,
} from "../crmpErrors";
import {
  isRegisterType,
  type RegisterType,
} from "../valueObjects";
import type { CashRegister } from "./registerContract";
import {
  assertCatalogAllowsDuty,
  assertRegisterDutyTransition,
  assertRegisterTransition,
  canHostFinancialShift,
  isDutyActive,
} from "./registerLifecycle";

export type ProvisionRegisterCommand = Readonly<{
  registerId: string;
  restaurantId: number;
  code: string;
  displayName: string;
  registerType: RegisterType;
  createdAt: string;
  /** Sibling registers in restaurant — enforce unique code. */
  siblingRegisters?: readonly CashRegister[];
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

export type RenameRegisterCommand = Readonly<{
  register: CashRegister;
  displayName: string;
  at: string;
}>;

export type ChangeRegisterTypeCommand = Readonly<{
  register: CashRegister;
  registerType: RegisterType;
  at: string;
}>;

export type UpdateRegisterCodeCommand = Readonly<{
  register: CashRegister;
  code: string;
  at: string;
  siblingRegisters?: readonly CashRegister[];
}>;

export type ArchiveRegisterCommand = Readonly<{
  register: CashRegister;
  hasActiveShift: boolean;
  at: string;
}>;

export type OpenRegisterCommand = Readonly<{
  register: CashRegister;
  at: string;
  /** Optional operator assign as part of open. */
  operatorUserId?: number | null;
  /**
   * Other restaurant registers — used to enforce one active operator assignment
   * across Duty-active registers.
   */
  siblingRegisters?: readonly CashRegister[];
}>;

export type CloseRegisterCommand = Readonly<{
  register: CashRegister;
  hasActiveShift: boolean;
  at: string;
}>;

export type SuspendRegisterCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

export type ResumeRegisterCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

export type AssignOperatorCommand = Readonly<{
  register: CashRegister;
  operatorUserId: number;
  at: string;
  siblingRegisters?: readonly CashRegister[];
}>;

export type ReleaseOperatorCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

export type ReassignOperatorCommand = Readonly<{
  register: CashRegister;
  operatorUserId: number;
  at: string;
  siblingRegisters?: readonly CashRegister[];
}>;

export type AttachDeviceCommand = Readonly<{
  register: CashRegister;
  deviceId: string;
  at: string;
  /** Other registers — device may bind to at most one Register. */
  siblingRegisters?: readonly CashRegister[];
}>;

export type DetachDeviceCommand = Readonly<{
  register: CashRegister;
  at: string;
}>;

export type ReplaceDeviceCommand = AttachDeviceCommand;

/** @deprecated Prefer attachDevice — kept as alias. */
export type BindDeviceCommand = AttachDeviceCommand;
/** @deprecated Prefer detachDevice — kept as alias. */
export type UnbindDeviceCommand = DetachDeviceCommand;

function bump(register: CashRegister, at: string): Pick<
  CashRegister,
  "version" | "updatedAt"
> {
  return { version: register.version + 1, updatedAt: at };
}

function assertValidOperatorUserId(operatorUserId: number): void {
  if (!Number.isInteger(operatorUserId) || operatorUserId <= 0) {
    throw new CrmpValidationError("operatorUserId must be a positive integer");
  }
}

export function normalizeRegisterCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new CrmpValidationError("register code required");
  }
  if (trimmed.length > 64) {
    throw new CrmpValidationError("register code too long");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(trimmed)) {
    throw new CrmpValidationError(
      "register code must be alphanumeric (optional _-)"
    );
  }
  return trimmed;
}

function assertCodeAvailable(
  registerId: string,
  restaurantId: number,
  code: string,
  siblings: readonly CashRegister[] | undefined
): void {
  if (!siblings) return;
  const conflict = siblings.find(
    (r) =>
      r.registerId !== registerId &&
      r.restaurantId === restaurantId &&
      r.code.toLowerCase() === code.toLowerCase()
  );
  if (conflict) {
    throw new CrmpConflictError(
      `Register code ${code} already used on Register ${conflict.registerId}`
    );
  }
}

function assertNotArchived(register: CashRegister): void {
  if (register.archivedAt != null) {
    throw new CrmpImmutabilityError("Archived Register cannot be modified");
  }
}

function assertOperatorAvailable(
  register: CashRegister,
  operatorUserId: number,
  siblings: readonly CashRegister[] | undefined
): void {
  if (!siblings) return;
  const conflict = siblings.find(
    (r) =>
      r.registerId !== register.registerId &&
      r.restaurantId === register.restaurantId &&
      isDutyActive(r.dutyStatus) &&
      r.assignedOperatorUserId === operatorUserId
  );
  if (conflict) {
    throw new CrmpConflictError(
      `Operator ${operatorUserId} already assigned on Register ${conflict.registerId}`
    );
  }
}

function withOperator(
  register: CashRegister,
  operatorUserId: number | null,
  at: string
): CashRegister {
  if (operatorUserId == null) {
    return {
      ...register,
      assignedOperatorUserId: null,
      operatorAssignedAt: null,
      ...bump(register, at),
    };
  }
  assertValidOperatorUserId(operatorUserId);
  return {
    ...register,
    assignedOperatorUserId: operatorUserId,
    operatorAssignedAt: at,
    ...bump(register, at),
  };
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
  if (!isRegisterType(command.registerType)) {
    throw new CrmpValidationError("invalid register type");
  }
  const code = normalizeRegisterCode(command.code);
  assertCodeAvailable(
    command.registerId,
    command.restaurantId,
    code,
    command.siblingRegisters
  );
  return {
    registerId: command.registerId,
    restaurantId: command.restaurantId,
    code,
    displayName: command.displayName.trim(),
    registerType: command.registerType,
    status: "provisioned",
    dutyStatus: "closed",
    archivedAt: null,
    deviceId: null,
    assignedOperatorUserId: null,
    operatorAssignedAt: null,
    version: 1,
    createdAt: command.createdAt,
    updatedAt: command.createdAt,
  };
}

export function activateRegister(
  command: ActivateRegisterCommand
): CashRegister {
  assertNotArchived(command.register);
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
  assertNotArchived(command.register);
  if (command.hasActiveShift) {
    throw new CrmpInvariantError(
      "Register cannot deactivate while a Financial Shift is active"
    );
  }
  if (command.register.dutyStatus !== "closed") {
    throw new CrmpInvariantError(
      "Register cannot deactivate while Duty is not closed"
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

export function renameRegister(command: RenameRegisterCommand): CashRegister {
  assertNotArchived(command.register);
  if (!command.displayName.trim()) {
    throw new CrmpValidationError("displayName required");
  }
  const displayName = command.displayName.trim();
  if (displayName === command.register.displayName) {
    return command.register;
  }
  return {
    ...command.register,
    displayName,
    ...bump(command.register, command.at),
  };
}

export function changeRegisterType(
  command: ChangeRegisterTypeCommand
): CashRegister {
  assertNotArchived(command.register);
  if (!isRegisterType(command.registerType)) {
    throw new CrmpValidationError("invalid register type");
  }
  if (command.registerType === command.register.registerType) {
    return command.register;
  }
  return {
    ...command.register,
    registerType: command.registerType,
    ...bump(command.register, command.at),
  };
}

export function updateRegisterCode(
  command: UpdateRegisterCodeCommand
): CashRegister {
  assertNotArchived(command.register);
  const code = normalizeRegisterCode(command.code);
  if (code.toLowerCase() === command.register.code.toLowerCase()) {
    if (code === command.register.code) return command.register;
  }
  assertCodeAvailable(
    command.register.registerId,
    command.register.restaurantId,
    code,
    command.siblingRegisters
  );
  return {
    ...command.register,
    code,
    ...bump(command.register, command.at),
  };
}

/**
 * Soft archive: catalog → inactive + archivedAt.
 * Not a new catalog status (ADR-030). Blocks reactivation.
 */
export function archiveRegister(command: ArchiveRegisterCommand): CashRegister {
  if (command.register.archivedAt != null) {
    return command.register;
  }
  if (command.hasActiveShift) {
    throw new CrmpInvariantError(
      "Register cannot archive while a Financial Shift is active"
    );
  }
  if (command.register.dutyStatus !== "closed") {
    throw new CrmpInvariantError(
      "Register cannot archive while Duty is not closed"
    );
  }
  if (command.register.status !== "inactive") {
    assertRegisterTransition(command.register.status, "inactive");
  }
  return {
    ...command.register,
    status: "inactive",
    archivedAt: command.at,
    ...bump(command.register, command.at),
  };
}

export function openRegister(command: OpenRegisterCommand): CashRegister {
  assertCatalogAllowsDuty(command.register);
  if (command.register.dutyStatus === "open") {
    const want = command.operatorUserId;
    if (want == null || want === undefined) {
      return command.register;
    }
    assertValidOperatorUserId(want);
    if (command.register.assignedOperatorUserId === want) {
      return command.register;
    }
    throw new CrmpConflictError(
      "Register Duty already open with a different operator; Release or Reassign"
    );
  }
  assertRegisterDutyTransition(command.register.dutyStatus, "open");
  let next: CashRegister = {
    ...command.register,
    dutyStatus: "open",
    ...bump(command.register, command.at),
  };
  if (command.operatorUserId != null && command.operatorUserId !== undefined) {
    assertValidOperatorUserId(command.operatorUserId);
    assertOperatorAvailable(
      next,
      command.operatorUserId,
      command.siblingRegisters
    );
    next = {
      ...next,
      assignedOperatorUserId: command.operatorUserId,
      operatorAssignedAt: command.at,
      // already bumped once for duty open
    };
  }
  return next;
}

export function closeRegister(command: CloseRegisterCommand): CashRegister {
  if (command.register.dutyStatus === "closed") {
    if (
      command.register.assignedOperatorUserId == null &&
      command.register.operatorAssignedAt == null
    ) {
      return command.register;
    }
    // Already closed but operator leftover — release without duty transition.
    return {
      ...command.register,
      assignedOperatorUserId: null,
      operatorAssignedAt: null,
      ...bump(command.register, command.at),
    };
  }
  if (command.hasActiveShift) {
    throw new CrmpInvariantError(
      "Register cannot close Duty while a Financial Shift is active"
    );
  }
  assertRegisterDutyTransition(command.register.dutyStatus, "closed");
  return {
    ...command.register,
    dutyStatus: "closed",
    assignedOperatorUserId: null,
    operatorAssignedAt: null,
    ...bump(command.register, command.at),
  };
}

export function suspendRegister(command: SuspendRegisterCommand): CashRegister {
  assertCatalogAllowsDuty(command.register);
  if (command.register.dutyStatus === "suspended") return command.register;
  assertRegisterDutyTransition(command.register.dutyStatus, "suspended");
  return {
    ...command.register,
    dutyStatus: "suspended",
    ...bump(command.register, command.at),
  };
}

export function resumeRegister(command: ResumeRegisterCommand): CashRegister {
  if (command.register.status !== "active") {
    throw new CrmpInvariantError(
      "Inactive Register cannot resume Duty"
    );
  }
  assertCatalogAllowsDuty(command.register);
  if (command.register.dutyStatus === "open") return command.register;
  assertRegisterDutyTransition(command.register.dutyStatus, "open");
  return {
    ...command.register,
    dutyStatus: "open",
    ...bump(command.register, command.at),
  };
}

export function assignOperator(command: AssignOperatorCommand): CashRegister {
  assertCatalogAllowsDuty(command.register);
  if (!isDutyActive(command.register.dutyStatus)) {
    throw new CrmpInvariantError(
      "Operator can only be assigned while Register Duty is open or suspended"
    );
  }
  assertValidOperatorUserId(command.operatorUserId);
  if (command.register.assignedOperatorUserId === command.operatorUserId) {
    return command.register;
  }
  if (command.register.assignedOperatorUserId != null) {
    throw new CrmpConflictError(
      "Register already has an assigned operator; Release or Reassign"
    );
  }
  assertOperatorAvailable(
    command.register,
    command.operatorUserId,
    command.siblingRegisters
  );
  return withOperator(command.register, command.operatorUserId, command.at);
}

export function releaseOperator(command: ReleaseOperatorCommand): CashRegister {
  if (command.register.assignedOperatorUserId == null) {
    return command.register;
  }
  return withOperator(command.register, null, command.at);
}

export function reassignOperator(
  command: ReassignOperatorCommand
): CashRegister {
  assertCatalogAllowsDuty(command.register);
  if (!isDutyActive(command.register.dutyStatus)) {
    throw new CrmpInvariantError(
      "Operator can only be reassigned while Register Duty is open or suspended"
    );
  }
  assertValidOperatorUserId(command.operatorUserId);
  if (command.register.assignedOperatorUserId === command.operatorUserId) {
    return command.register;
  }
  assertOperatorAvailable(
    command.register,
    command.operatorUserId,
    command.siblingRegisters
  );
  return withOperator(command.register, command.operatorUserId, command.at);
}

export function attachDevice(command: AttachDeviceCommand): CashRegister {
  if (!command.deviceId.trim()) {
    throw new CrmpValidationError("deviceId required");
  }
  const deviceId = command.deviceId.trim();
  if (command.register.deviceId === deviceId) {
    return command.register;
  }
  if (command.siblingRegisters) {
    const conflict = command.siblingRegisters.find(
      (r) =>
        r.registerId !== command.register.registerId &&
        r.restaurantId === command.register.restaurantId &&
        r.deviceId === deviceId
    );
    if (conflict) {
      throw new CrmpConflictError(
        `Device ${deviceId} already attached to Register ${conflict.registerId}`
      );
    }
  }
  return {
    ...command.register,
    deviceId,
    ...bump(command.register, command.at),
  };
}

export function detachDevice(command: DetachDeviceCommand): CashRegister {
  if (command.register.deviceId == null) return command.register;
  return {
    ...command.register,
    deviceId: null,
    ...bump(command.register, command.at),
  };
}

export function replaceDevice(command: ReplaceDeviceCommand): CashRegister {
  return attachDevice(command);
}

/** Alias — prefer attachDevice. */
export function bindDevice(command: BindDeviceCommand): CashRegister {
  return attachDevice(command);
}

/** Alias — prefer detachDevice. */
export function unbindDevice(command: UnbindDeviceCommand): CashRegister {
  return detachDevice(command);
}

/** Guard used by OpenFinancialShift coordination. */
export function assertRegisterCanOpenShift(register: CashRegister): void {
  if (!canHostFinancialShift(register)) {
    throw new CrmpInvariantError(
      `Register catalog=${register.status} duty=${register.dutyStatus} cannot host a Financial Shift`
    );
  }
}

export function assertRegisterNotMutatingMoney(): void {
  throw new CrmpImmutabilityError(
    "Register must never own or mutate Settlement money"
  );
}
