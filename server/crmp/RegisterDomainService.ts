/**
 * CRMP-IMPLEMENTATION-1 — Register domain service.
 * No Settlement / Check / channel orchestration.
 */

import {
  activateRegister,
  bindDevice,
  deactivateRegister,
  provisionRegister,
  unbindDevice,
  type CashRegister,
  CrmpNotFoundError,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { newCrmpId } from "./crmpIds";

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
  }): Promise<CashRegister> {
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = activateRegister({
      register: current,
      at: input.at ?? new Date().toISOString(),
    });
    await this.uow.registers.update(next);
    return next;
  }

  async deactivate(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
  }): Promise<CashRegister> {
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
      at: input.at ?? new Date().toISOString(),
    });
    await this.uow.registers.update(next);
    return next;
  }

  async bindDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    at?: string;
  }): Promise<CashRegister> {
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = bindDevice({
      register: current,
      deviceId: input.deviceId,
      at: input.at ?? new Date().toISOString(),
    });
    await this.uow.registers.update(next);
    return next;
  }

  async unbindDevice(input: {
    restaurantId: number;
    registerId: string;
    at?: string;
  }): Promise<CashRegister> {
    const current = await this.requireRegister(
      input.restaurantId,
      input.registerId
    );
    const next = unbindDevice({
      register: current,
      at: input.at ?? new Date().toISOString(),
    });
    await this.uow.registers.update(next);
    return next;
  }

  async get(restaurantId: number, registerId: string): Promise<CashRegister | null> {
    return this.uow.registers.findById(restaurantId, registerId);
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
