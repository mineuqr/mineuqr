/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 — Register domain events.
 *
 * Collected facts only — no bus, outbox, or transport in this program.
 * Ordering: per-register monotonic `version`.
 * Idempotency: consumers key on `claimKey` = `${registerId}:${eventType}:v${version}`.
 */

import type { RegisterDutyStatus, RegisterStatus } from "../valueObjects";
import type { CashRegister } from "./registerContract";

export const REGISTER_DOMAIN_EVENT_TYPES = [
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
