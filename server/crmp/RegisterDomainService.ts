/**
 * ADR-ARCH-030 / REGISTER-OPERATIONS-IMPLEMENTATION-1 — Register domain service.
 * Catalog + Duty + operator + device. No Settlement / Check / channel orchestration.
 * Events are collected facts (no bus/outbox in this program).
 */

import {
  activateRegister,
  assignOperator,
  attachDevice,
  buildDeviceAttachedEvent,
  buildDeviceDetachedEvent,
  buildOperatorAssignedEvent,
  buildOperatorReleasedEvent,
  buildRegisterClosedEvent,
  buildRegisterOpenedEvent,
  buildRegisterResolvedEvent,
  buildRegisterResumedEvent,
  buildRegisterSuspendedEvent,
  closeRegister,
  deactivateRegister,
  detachDevice,
  openRegister,
  provisionRegister,
  reassignOperator,
  releaseOperator,
  replaceDevice,
  resolveActiveRegister,
  resolveRegisterByDevice,
  resolveRegisterByOperator,
  resumeRegister,
  suspendRegister,
  type CashRegister,
  type RegisterDomainEvent,
  CrmpNotFoundError,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { newCrmpId } from "./crmpIds";

export type RegisterCommandResult = Readonly<{
  register: CashRegister;
  events: readonly RegisterDomainEvent[];
  alreadyApplied?: boolean;
}>;

export class RegisterDomainService {
  constructor(private readonly uow: CrmpUnitOfWork) {}

  async provision(input: {
    restaurantId: number;
    displayName: string;
    at?: string;
    registerId?: string;
  }): Promise<CashRegister> {
    const at = input.at ?? new Date().toISOString();
    const register = provisionRegister({
      registerId: input.registerId ?? newCrmpId("reg"),
      restaurantId: input.restaurantId,
      displayName: input.displayName,
      createdAt: at,
    });
    await this.uow.registers.insert(register);
    return register;
  }

  async activate(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = activateRegister({ register: current, at });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return { register: next, events: [], alreadyApplied: false };
  }

  async deactivate(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const active = await this.uow.shifts.findActiveByRegister(
      input.restaurantId,
      input.registerId
    );
    const next = deactivateRegister({
      register: current,
      hasActiveShift: active != null,
      at,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return { register: next, events: [], alreadyApplied: false };
  }

  async open(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    operatorUserId?: number | null;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const siblings = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const next = openRegister({
      register: current,
      at,
      operatorUserId: input.operatorUserId,
      siblingRegisters: siblings,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    const events: RegisterDomainEvent[] = [
      buildRegisterOpenedEvent(next, at),
    ];
    if (
      input.operatorUserId != null &&
      next.assignedOperatorUserId === input.operatorUserId &&
      current.assignedOperatorUserId !== input.operatorUserId
    ) {
      events.push(buildOperatorAssignedEvent(next, at));
    }
    return { register: next, events, alreadyApplied: false };
  }

  async close(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const active = await this.uow.shifts.findActiveByRegister(
      input.restaurantId,
      input.registerId
    );
    const previousOperator = current.assignedOperatorUserId;
    const next = closeRegister({
      register: current,
      hasActiveShift: active != null,
      at,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    const events: RegisterDomainEvent[] = [];
    if (current.dutyStatus !== "closed") {
      events.push(buildRegisterClosedEvent(next, at));
    }
    if (previousOperator != null) {
      events.push(buildOperatorReleasedEvent(next, previousOperator, at));
    }
    return { register: next, events, alreadyApplied: false };
  }

  async suspend(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = suspendRegister({ register: current, at });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return {
      register: next,
      events: [buildRegisterSuspendedEvent(next, at)],
      alreadyApplied: false,
    };
  }

  async resume(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = resumeRegister({ register: current, at });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return {
      register: next,
      events: [buildRegisterResumedEvent(next, at)],
      alreadyApplied: false,
    };
  }

  async assignOperator(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const siblings = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const next = assignOperator({
      register: current,
      operatorUserId: input.operatorUserId,
      at,
      siblingRegisters: siblings,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return {
      register: next,
      events: [buildOperatorAssignedEvent(next, at)],
      alreadyApplied: false,
    };
  }

  async releaseOperator(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const previous = current.assignedOperatorUserId;
    const next = releaseOperator({ register: current, at });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return {
      register: next,
      events:
        previous != null
          ? [buildOperatorReleasedEvent(next, previous, at)]
          : [],
      alreadyApplied: false,
    };
  }

  async reassignOperator(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const siblings = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const previous = current.assignedOperatorUserId;
    const next = reassignOperator({
      register: current,
      operatorUserId: input.operatorUserId,
      at,
      siblingRegisters: siblings,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    const events: RegisterDomainEvent[] = [];
    if (previous != null && previous !== input.operatorUserId) {
      events.push(buildOperatorReleasedEvent(next, previous, at));
    }
    events.push(buildOperatorAssignedEvent(next, at));
    return { register: next, events, alreadyApplied: false };
  }

  async attachDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const siblings = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const previousDevice = current.deviceId;
    const next = attachDevice({
      register: current,
      deviceId: input.deviceId,
      at,
      siblingRegisters: siblings,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    const events: RegisterDomainEvent[] = [];
    if (previousDevice && previousDevice !== next.deviceId) {
      events.push(buildDeviceDetachedEvent(next, previousDevice, at));
    }
    events.push(buildDeviceAttachedEvent(next, at));
    return { register: next, events, alreadyApplied: false };
  }

  async detachDevice(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const previousDevice = current.deviceId;
    const next = detachDevice({ register: current, at });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    return {
      register: next,
      events:
        previousDevice != null
          ? [buildDeviceDetachedEvent(next, previousDevice, at)]
          : [],
      alreadyApplied: false,
    };
  }

  async replaceDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const siblings = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const previousDevice = current.deviceId;
    const next = replaceDevice({
      register: current,
      deviceId: input.deviceId,
      at,
      siblingRegisters: siblings,
    });
    if (next === current || next.version === current.version) {
      return { register: current, events: [], alreadyApplied: true };
    }
    await this.uow.registers.update(
      next,
      input.expectedVersion ?? current.version
    );
    const events: RegisterDomainEvent[] = [];
    if (previousDevice && previousDevice !== next.deviceId) {
      events.push(buildDeviceDetachedEvent(next, previousDevice, at));
    }
    events.push(buildDeviceAttachedEvent(next, at));
    return { register: next, events, alreadyApplied: false };
  }

  /** @deprecated Prefer attachDevice */
  async bindDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<CashRegister> {
    const result = await this.attachDevice(input);
    return result.register;
  }

  /** @deprecated Prefer detachDevice */
  async unbindDevice(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<CashRegister> {
    const result = await this.detachDevice(input);
    return result.register;
  }

  async resolveActive(input: {
    restaurantId: number;
    registerId?: string | null;
    requireDutyOpen?: boolean;
    at?: string;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const registers = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const register = resolveActiveRegister({
      restaurantId: input.restaurantId,
      registers,
      registerId: input.registerId,
      requireDutyOpen: input.requireDutyOpen,
    });
    return {
      register,
      events: [
        buildRegisterResolvedEvent(
          register,
          at,
          input.registerId?.trim() ? "by_id" : "active"
        ),
      ],
    };
  }

  async resolveByDevice(input: {
    restaurantId: number;
    deviceId: string;
    at?: string;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const registers = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const register = resolveRegisterByDevice({
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      registers,
    });
    return {
      register,
      events: [buildRegisterResolvedEvent(register, at, "by_device")],
    };
  }

  async resolveByOperator(input: {
    restaurantId: number;
    operatorUserId: number;
    at?: string;
  }): Promise<RegisterCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const registers = await this.uow.registers.listByRestaurant(
      input.restaurantId
    );
    const register = resolveRegisterByOperator({
      restaurantId: input.restaurantId,
      operatorUserId: input.operatorUserId,
      registers,
    });
    return {
      register,
      events: [buildRegisterResolvedEvent(register, at, "by_operator")],
    };
  }

  async get(
    restaurantId: number,
    registerId: string
  ): Promise<CashRegister | null> {
    return this.uow.registers.findById(restaurantId, registerId);
  }

  /** Catalog list for restaurant — no Duty filter (caller/API maps availability). */
  async listByRestaurant(restaurantId: number): Promise<CashRegister[]> {
    return this.uow.registers.listByRestaurant(restaurantId);
  }

  private async requireRegister(
    restaurantId: number,
    registerId: string
  ): Promise<CashRegister> {
    const row = await this.uow.registers.findById(restaurantId, registerId);
    if (!row) throw new CrmpNotFoundError(`Register not found: ${registerId}`);
    return row;
  }
}
