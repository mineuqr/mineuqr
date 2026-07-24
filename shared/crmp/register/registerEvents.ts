/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 /
 * REGISTER-CATALOG-MANAGEMENT-1 — Register domain events.
 *
 * Collected facts only — no bus, outbox, or transport in this program.
 * Ordering: per-register monotonic `version`.
 * Idempotency: consumers key on `claimKey` = `${registerId}:${eventType}:v${version}`.
 */

import type {
  RegisterDutyStatus,
  RegisterStatus,
  RegisterType,
} from "../valueObjects";
import type { CashRegister } from "./registerContract";

export const REGISTER_DOMAIN_EVENT_TYPES = [
  // Catalog plane
  "RegisterProvisioned",
  "RegisterActivated",
  "RegisterDeactivated",
  "RegisterRenamed",
  "RegisterTypeChanged",
  "RegisterArchived",
  // Duty / operations plane
  "RegisterOpened",
  "RegisterClosed",
  "RegisterSuspended",
  "RegisterResumed",
  "OperatorAssigned",
  "OperatorReleased",
  "DeviceAttached",
  "DeviceDetached",
  "RegisterResolved",
] as const;

export type RegisterDomainEventType =
  (typeof REGISTER_DOMAIN_EVENT_TYPES)[number];

type RegisterEventBase = Readonly<{
  eventType: RegisterDomainEventType;
  restaurantId: number;
  registerId: string;
  catalogStatus: RegisterStatus;
  dutyStatus: RegisterDutyStatus;
  version: number;
  occurredAt: string;
  claimKey: string;
}>;

export type RegisterProvisioned = RegisterEventBase &
  Readonly<{
    eventType: "RegisterProvisioned";
    code: string;
    displayName: string;
    registerType: RegisterType;
  }>;

export type RegisterActivated = RegisterEventBase &
  Readonly<{ eventType: "RegisterActivated" }>;

export type RegisterDeactivated = RegisterEventBase &
  Readonly<{ eventType: "RegisterDeactivated" }>;

export type RegisterRenamed = RegisterEventBase &
  Readonly<{
    eventType: "RegisterRenamed";
    displayName: string;
    previousDisplayName: string;
  }>;

export type RegisterTypeChanged = RegisterEventBase &
  Readonly<{
    eventType: "RegisterTypeChanged";
    registerType: RegisterType;
    previousRegisterType: RegisterType;
  }>;

export type RegisterArchived = RegisterEventBase &
  Readonly<{
    eventType: "RegisterArchived";
    archivedAt: string;
  }>;

export type RegisterOpened = RegisterEventBase &
  Readonly<{
    eventType: "RegisterOpened";
    assignedOperatorUserId: number | null;
  }>;

export type RegisterClosed = RegisterEventBase &
  Readonly<{ eventType: "RegisterClosed" }>;

export type RegisterSuspended = RegisterEventBase &
  Readonly<{ eventType: "RegisterSuspended" }>;

export type RegisterResumed = RegisterEventBase &
  Readonly<{ eventType: "RegisterResumed" }>;

export type OperatorAssigned = RegisterEventBase &
  Readonly<{
    eventType: "OperatorAssigned";
    assignedOperatorUserId: number;
  }>;

export type OperatorReleased = RegisterEventBase &
  Readonly<{
    eventType: "OperatorReleased";
    previousOperatorUserId: number;
  }>;

export type DeviceAttached = RegisterEventBase &
  Readonly<{
    eventType: "DeviceAttached";
    deviceId: string;
  }>;

export type DeviceDetached = RegisterEventBase &
  Readonly<{
    eventType: "DeviceDetached";
    previousDeviceId: string;
  }>;

export type RegisterResolved = RegisterEventBase &
  Readonly<{
    eventType: "RegisterResolved";
    resolution: "active" | "by_device" | "by_operator" | "by_id";
    deviceId: string | null;
    assignedOperatorUserId: number | null;
  }>;

export type RegisterDomainEvent =
  | RegisterProvisioned
  | RegisterActivated
  | RegisterDeactivated
  | RegisterRenamed
  | RegisterTypeChanged
  | RegisterArchived
  | RegisterOpened
  | RegisterClosed
  | RegisterSuspended
  | RegisterResumed
  | OperatorAssigned
  | OperatorReleased
  | DeviceAttached
  | DeviceDetached
  | RegisterResolved;

export function buildRegisterEventClaimKey(input: {
  registerId: string;
  eventType: RegisterDomainEventType;
  version: number;
  /** Optional disambiguator for non-mutating resolve facts. */
  suffix?: string;
}): string {
  const base = `${input.registerId}:${input.eventType}:v${input.version}`;
  return input.suffix ? `${base}:${input.suffix}` : base;
}

function base(
  register: CashRegister,
  eventType: RegisterDomainEventType,
  occurredAt: string,
  suffix?: string
): RegisterEventBase {
  return {
    eventType,
    restaurantId: register.restaurantId,
    registerId: register.registerId,
    catalogStatus: register.status,
    dutyStatus: register.dutyStatus,
    version: register.version,
    occurredAt,
    claimKey: buildRegisterEventClaimKey({
      registerId: register.registerId,
      eventType,
      version: register.version,
      suffix,
    }),
  };
}

export function buildRegisterProvisionedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterProvisioned {
  return {
    ...base(register, "RegisterProvisioned", occurredAt),
    eventType: "RegisterProvisioned",
    code: register.code,
    displayName: register.displayName,
    registerType: register.registerType,
  };
}

export function buildRegisterActivatedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterActivated {
  return {
    ...base(register, "RegisterActivated", occurredAt),
    eventType: "RegisterActivated",
  };
}

export function buildRegisterDeactivatedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterDeactivated {
  return {
    ...base(register, "RegisterDeactivated", occurredAt),
    eventType: "RegisterDeactivated",
  };
}

export function buildRegisterRenamedEvent(
  register: CashRegister,
  previousDisplayName: string,
  occurredAt: string
): RegisterRenamed {
  return {
    ...base(register, "RegisterRenamed", occurredAt),
    eventType: "RegisterRenamed",
    displayName: register.displayName,
    previousDisplayName,
  };
}

export function buildRegisterTypeChangedEvent(
  register: CashRegister,
  previousRegisterType: RegisterType,
  occurredAt: string
): RegisterTypeChanged {
  return {
    ...base(register, "RegisterTypeChanged", occurredAt),
    eventType: "RegisterTypeChanged",
    registerType: register.registerType,
    previousRegisterType,
  };
}

export function buildRegisterArchivedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterArchived {
  if (!register.archivedAt) {
    throw new Error("RegisterArchived requires archivedAt");
  }
  return {
    ...base(register, "RegisterArchived", occurredAt),
    eventType: "RegisterArchived",
    archivedAt: register.archivedAt,
  };
}

export function buildRegisterOpenedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterOpened {
  return {
    ...base(register, "RegisterOpened", occurredAt),
    eventType: "RegisterOpened",
    assignedOperatorUserId: register.assignedOperatorUserId,
  };
}

export function buildRegisterClosedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterClosed {
  return {
    ...base(register, "RegisterClosed", occurredAt),
    eventType: "RegisterClosed",
  };
}

export function buildRegisterSuspendedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterSuspended {
  return {
    ...base(register, "RegisterSuspended", occurredAt),
    eventType: "RegisterSuspended",
  };
}

export function buildRegisterResumedEvent(
  register: CashRegister,
  occurredAt: string
): RegisterResumed {
  return {
    ...base(register, "RegisterResumed", occurredAt),
    eventType: "RegisterResumed",
  };
}

export function buildOperatorAssignedEvent(
  register: CashRegister,
  occurredAt: string
): OperatorAssigned {
  if (register.assignedOperatorUserId == null) {
    throw new Error("OperatorAssigned requires assignedOperatorUserId");
  }
  return {
    ...base(register, "OperatorAssigned", occurredAt),
    eventType: "OperatorAssigned",
    assignedOperatorUserId: register.assignedOperatorUserId,
  };
}

export function buildOperatorReleasedEvent(
  register: CashRegister,
  previousOperatorUserId: number,
  occurredAt: string
): OperatorReleased {
  return {
    ...base(register, "OperatorReleased", occurredAt),
    eventType: "OperatorReleased",
    previousOperatorUserId,
  };
}

export function buildDeviceAttachedEvent(
  register: CashRegister,
  occurredAt: string
): DeviceAttached {
  if (!register.deviceId) {
    throw new Error("DeviceAttached requires deviceId");
  }
  return {
    ...base(register, "DeviceAttached", occurredAt),
    eventType: "DeviceAttached",
    deviceId: register.deviceId,
  };
}

export function buildDeviceDetachedEvent(
  register: CashRegister,
  previousDeviceId: string,
  occurredAt: string
): DeviceDetached {
  return {
    ...base(register, "DeviceDetached", occurredAt),
    eventType: "DeviceDetached",
    previousDeviceId,
  };
}

export function buildRegisterResolvedEvent(
  register: CashRegister,
  occurredAt: string,
  resolution: RegisterResolved["resolution"]
): RegisterResolved {
  return {
    ...base(register, "RegisterResolved", occurredAt, occurredAt),
    eventType: "RegisterResolved",
    resolution,
    deviceId: register.deviceId,
    assignedOperatorUserId: register.assignedOperatorUserId,
  };
}
