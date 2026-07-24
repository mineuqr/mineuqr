/**
 * CRMP-OPERATIONS-API-1 — thin application orchestration.
 * Auth / validation live in the router. Domain rules stay in domain services.
 */

import { CrmpNotFoundError } from "@shared/crmp";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import type { RegisterDomainService } from "../RegisterDomainService";
import type {
  CurrentRegisterViewDto,
  FinancialShiftRefDto,
  RegisterCommandResultDto,
  RegisterDto,
  RegisterHistoryDto,
} from "./crmpApiDtos";
import {
  toFinancialShiftRefDto,
  toRegisterCommandResultDto,
  toRegisterDto,
} from "./crmpApiMapper";

export class CrmpRegisterOperationsService {
  constructor(
    private readonly registers: RegisterDomainService,
    private readonly shifts: FinancialShiftDomainService
  ) {}

  async open(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId?: number | null;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.open(input);
    return toRegisterCommandResultDto(result);
  }

  async close(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.close(input);
    return toRegisterCommandResultDto(result);
  }

  async suspend(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.suspend(input);
    return toRegisterCommandResultDto(result);
  }

  async resume(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.resume(input);
    return toRegisterCommandResultDto(result);
  }

  async assignOperator(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.assignOperator(input);
    return toRegisterCommandResultDto(result);
  }

  async releaseOperator(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.releaseOperator(input);
    return toRegisterCommandResultDto(result);
  }

  async reassignOperator(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.reassignOperator(input);
    return toRegisterCommandResultDto(result);
  }

  async attachDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.attachDevice(input);
    return toRegisterCommandResultDto(result);
  }

  async detachDevice(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.detachDevice(input);
    return toRegisterCommandResultDto(result);
  }

  async replaceDevice(input: {
    restaurantId: number;
    registerId: string;
    deviceId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.replaceDevice(input);
    return toRegisterCommandResultDto(result);
  }

  async resolveActive(input: {
    restaurantId: number;
    registerId?: string | null;
    requireDutyOpen?: boolean;
  }): Promise<RegisterDto> {
    const result = await this.registers.resolveActive(input);
    return toRegisterDto(result.register);
  }

  async resolveByDevice(input: {
    restaurantId: number;
    deviceId: string;
  }): Promise<RegisterDto> {
    const result = await this.registers.resolveByDevice(input);
    return toRegisterDto(result.register);
  }

  async resolveByOperator(input: {
    restaurantId: number;
    operatorUserId: number;
  }): Promise<RegisterDto> {
    const result = await this.registers.resolveByOperator(input);
    return toRegisterDto(result.register);
  }

  async get(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<RegisterDto> {
    const register = await this.registers.get(
      input.restaurantId,
      input.registerId
    );
    if (!register) {
      throw new CrmpNotFoundError(`Register not found: ${input.registerId}`);
    }
    return toRegisterDto(register);
  }

  async getCurrentView(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<CurrentRegisterViewDto> {
    const register = await this.get(input);
    const shift = await this.shifts.resolveActive({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
    });
    return {
      register,
      dutyStatus: register.dutyStatus,
      operatorUserId: register.assignedOperatorUserId,
      deviceId: register.deviceId,
      financialShift: shift ? toFinancialShiftRefDto(shift) : null,
    };
  }

  async listAvailable(input: {
    restaurantId: number;
  }): Promise<RegisterDto[]> {
    const rows = await this.registers.listByRestaurant(input.restaurantId);
    return rows.map(toRegisterDto);
  }

  async getHistory(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<RegisterHistoryDto> {
    // Ensure register exists (tenant-scoped).
    await this.get(input);
    const shifts = await this.shifts.listByRegister(input);
    return {
      registerId: input.registerId,
      restaurantId: input.restaurantId,
      shifts: shifts.map(toFinancialShiftRefDto),
    };
  }

  async getCurrentFinancialShift(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShiftRefDto | null> {
    await this.get(input);
    const shift = await this.shifts.resolveActive(input);
    return shift ? toFinancialShiftRefDto(shift) : null;
  }
}
