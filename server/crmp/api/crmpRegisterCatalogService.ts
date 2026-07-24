/**
 * REGISTER-CATALOG-MANAGEMENT-1 — thin catalog application orchestration.
 * Auth / validation live in the router. Domain rules stay in RegisterDomainService.
 * No Duty commands. No Settlement / Check / Reporting.
 */

import { CrmpNotFoundError, type RegisterType } from "@shared/crmp";
import type { RegisterDomainService } from "../RegisterDomainService";
import type { RegisterCommandResultDto, RegisterDto } from "./crmpApiDtos";
import {
  toRegisterCommandResultDto,
  toRegisterDto,
} from "./crmpApiMapper";

export class CrmpRegisterCatalogService {
  constructor(private readonly registers: RegisterDomainService) {}

  async create(input: {
    restaurantId: number;
    code: string;
    displayName: string;
    registerType: RegisterType;
    at?: string;
    registerId?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.provision(input);
    return toRegisterCommandResultDto(result);
  }

  async update(input: {
    restaurantId: number;
    registerId: string;
    displayName?: string;
    code?: string;
    registerType?: RegisterType;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.update(input);
    return toRegisterCommandResultDto(result);
  }

  async activate(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.activate(input);
    return toRegisterCommandResultDto(result);
  }

  async deactivate(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.deactivate(input);
    return toRegisterCommandResultDto(result);
  }

  async rename(input: {
    restaurantId: number;
    registerId: string;
    displayName: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.rename(input);
    return toRegisterCommandResultDto(result);
  }

  async changeType(input: {
    restaurantId: number;
    registerId: string;
    registerType: RegisterType;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.changeType(input);
    return toRegisterCommandResultDto(result);
  }

  async archive(input: {
    restaurantId: number;
    registerId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<RegisterCommandResultDto> {
    const result = await this.registers.archive(input);
    return toRegisterCommandResultDto(result);
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

  async listByRestaurant(input: {
    restaurantId: number;
  }): Promise<RegisterDto[]> {
    const rows = await this.registers.listByRestaurant(input.restaurantId);
    return rows.map(toRegisterDto);
  }

  async list(input: {
    restaurantId: number;
  }): Promise<RegisterDto[]> {
    return this.listByRestaurant(input);
  }

  async search(input: {
    restaurantId: number;
    query?: string;
    catalogStatus?: RegisterDto["catalogStatus"];
    registerType?: RegisterType;
    includeArchived?: boolean;
  }): Promise<RegisterDto[]> {
    const rows = await this.listByRestaurant({
      restaurantId: input.restaurantId,
    });
    const q = input.query?.trim().toLowerCase() ?? "";
    return rows.filter((r) => {
      if (!input.includeArchived && r.archivedAt != null) return false;
      if (input.catalogStatus && r.catalogStatus !== input.catalogStatus) {
        return false;
      }
      if (input.registerType && r.registerType !== input.registerType) {
        return false;
      }
      if (!q) return true;
      return (
        r.displayName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.registerId.toLowerCase().includes(q) ||
        r.registerType.toLowerCase().includes(q)
      );
    });
  }
}
