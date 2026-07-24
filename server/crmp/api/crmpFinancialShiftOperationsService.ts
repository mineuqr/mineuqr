/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — thin application orchestration.
 * Auth / validation live in the router. Domain rules stay in domain services.
 * Does not own money formulas — reads expected cash from FinancialShiftDomainService.
 */

import { CrmpNotFoundError } from "@shared/crmp";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import type {
  FinancialShiftCommandResultDto,
  FinancialShiftTenderSummaryDto,
  FinancialShiftViewDto,
} from "./crmpApiDtos";
import { toFinancialShiftCommandResultDto } from "./crmpApiMapper";
import {
  buildFinancialShiftTenderSummary,
  type SettlementRecordBatchLoader,
} from "./crmpFinancialShiftTenderSummary";

export class CrmpFinancialShiftOperationsService {
  constructor(
    private readonly shifts: FinancialShiftDomainService,
    private readonly loadSettlementRecords?: SettlementRecordBatchLoader
  ) {}

  async open(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    openingFloatAmount: string;
    currencyCode: string;
    at?: string;
    financialShiftId?: string;
  }): Promise<FinancialShiftCommandResultDto> {
    const result = await this.shifts.open(input);
    const expectedCashAmount = await this.shifts.getExpectedCash(
      input.restaurantId,
      result.shift.financialShiftId
    );
    return toFinancialShiftCommandResultDto({
      shift: result.shift,
      expectedCashAmount,
      alreadyApplied: result.alreadyApplied,
    });
  }

  /**
   * Application close corridor: final cash count → domain close.
   * Amount is recorded via certified `recordCount`; `close` stays amount-free.
   */
  async close(input: {
    restaurantId: number;
    financialShiftId: string;
    actualCashAmount: string;
    actorUserId: number;
    expectedVersion?: number;
    at?: string;
  }): Promise<FinancialShiftCommandResultDto> {
    const counted = await this.shifts.recordCount({
      restaurantId: input.restaurantId,
      financialShiftId: input.financialShiftId,
      kind: "final",
      actualAmount: input.actualCashAmount,
      actorUserId: input.actorUserId,
      at: input.at,
      expectedVersion: input.expectedVersion,
    });
    const result = await this.shifts.close({
      restaurantId: input.restaurantId,
      financialShiftId: input.financialShiftId,
      at: input.at,
      expectedVersion: counted.version,
    });
    const expectedCashAmount = await this.shifts.getExpectedCash(
      input.restaurantId,
      result.shift.financialShiftId
    );
    return toFinancialShiftCommandResultDto({
      shift: result.shift,
      expectedCashAmount,
      alreadyApplied: result.alreadyApplied,
    });
  }

  async getCurrent(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShiftViewDto | null> {
    const shift = await this.shifts.resolveActive(input);
    if (!shift) return null;
    const expectedCashAmount = await this.shifts.getExpectedCash(
      input.restaurantId,
      shift.financialShiftId
    );
    return toFinancialShiftCommandResultDto({
      shift,
      expectedCashAmount,
    }).shift;
  }

  async requireCurrent(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShiftViewDto> {
    const current = await this.getCurrent(input);
    if (!current) {
      throw new CrmpNotFoundError(
        `No active Financial Shift for register: ${input.registerId}`
      );
    }
    return current;
  }

  /** Shift-scoped tender mix — Settlement snapshots + Reporting bucket rules. */
  async getTenderSummary(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShiftTenderSummaryDto | null> {
    return buildFinancialShiftTenderSummary({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
      shifts: this.shifts,
      loadSettlementRecords: this.loadSettlementRecords,
    });
  }
}
