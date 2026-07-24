/**
 * CRMP-IMPLEMENTATION-1 — Financial Shift domain service.
 * Owns drawer / movements / counts / handover / attribution persistence coordination.
 * Does NOT call Settlement / Check platforms.
 */

import {
  acceptHandover,
  closeFinancialShift,
  createSettlementAttribution,
  initiateHandover,
  openFinancialShift,
  recordDrawerCount,
  recordDrawerMovement,
  rejectHandover,
  type FinancialShift,
  type MovementType,
  type SettlementAttribution,
  CrmpNotFoundError,
  computeExpectedCash,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { newCrmpId } from "./crmpIds";

export class FinancialShiftDomainService {
  constructor(private readonly uow: CrmpUnitOfWork) {}

  async open(input: {
    restaurantId: number;
    registerId: string;
    operatorUserId: number;
    openingFloatAmount: string;
    currencyCode: string;
    at?: string;
    financialShiftId?: string;
  }): Promise<FinancialShift> {
    const register = await this.uow.registers.findById(
      input.restaurantId,
      input.registerId
    );
    if (!register) {
      throw new CrmpNotFoundError(`Register not found: ${input.registerId}`);
    }
    const active = await this.uow.shifts.findActiveByRegister(
      input.restaurantId,
      input.registerId
    );
    const shift = openFinancialShift({
      financialShiftId: input.financialShiftId ?? newCrmpId("fsh"),
      drawerId: newCrmpId("drw"),
      openingMovementId: newCrmpId("mov"),
      register,
      hasActiveShiftOnRegister: active != null,
      restaurantId: input.restaurantId,
      operatorUserId: input.operatorUserId,
      openingFloatAmount: input.openingFloatAmount,
      currencyCode: input.currencyCode,
      openedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.insert(shift);
    return shift;
  }

  async recordMovement(input: {
    restaurantId: number;
    financialShiftId: string;
    movementType: Exclude<MovementType, "opening_float">;
    amount: string;
    reason: string | null;
    actorUserId: number;
    at?: string;
  }): Promise<FinancialShift> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = recordDrawerMovement({
      shift: current,
      movementId: newCrmpId("mov"),
      movementType: input.movementType,
      amount: input.amount,
      reason: input.reason,
      actorUserId: input.actorUserId,
      recordedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(next);
    return next;
  }

  async recordCount(input: {
    restaurantId: number;
    financialShiftId: string;
    kind: "interim" | "final";
    actualAmount: string;
    actorUserId: number;
    at?: string;
  }): Promise<FinancialShift> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = recordDrawerCount({
      shift: current,
      countId: newCrmpId("cnt"),
      kind: input.kind,
      actualAmount: input.actualAmount,
      actorUserId: input.actorUserId,
      recordedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(next);
    return next;
  }

  async close(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
  }): Promise<FinancialShift> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = closeFinancialShift({
      shift: current,
      closedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(next);
    return next;
  }

  /**
   * Domain-only attribution. Caller supplies settlementRecordId + cashTenderAmount.
   * No Settlement Platform integration in CRMP-IMPLEMENTATION-1.
   */
  async createAttribution(input: {
    restaurantId: number;
    financialShiftId: string;
    settlementRecordId: string;
    operatorUserId: number;
    cashTenderAmount: string;
    at?: string;
  }): Promise<{
    shift: FinancialShift;
    attribution: SettlementAttribution;
    alreadyApplied: boolean;
  }> {
    const existing =
      await this.uow.shifts.findAttributionBySettlementRecordId(
        input.restaurantId,
        input.settlementRecordId
      );
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const result = createSettlementAttribution({
      shift: current,
      attributionId: newCrmpId("attr"),
      settlementRecordId: input.settlementRecordId,
      operatorUserId: input.operatorUserId,
      cashTenderAmount: input.cashTenderAmount,
      attributedAt: input.at ?? new Date().toISOString(),
      existingBySettlementRecordId: existing,
    });
    if (!result.alreadyApplied) {
      await this.uow.shifts.save(result.shift);
    }
    return result;
  }

  async initiateHandover(input: {
    restaurantId: number;
    financialShiftId: string;
    initiatorUserId: number;
    receiverUserId: number;
    at?: string;
  }): Promise<FinancialShift> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = initiateHandover({
      shift: current,
      handoverId: newCrmpId("ho"),
      initiatorUserId: input.initiatorUserId,
      receiverUserId: input.receiverUserId,
      offeredAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(next);
    return next;
  }

  async rejectHandover(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
  }): Promise<FinancialShift> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = rejectHandover({
      shift: current,
      rejectedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(next);
    return next;
  }

  async acceptHandover(input: {
    restaurantId: number;
    financialShiftId: string;
    acceptingUserId: number;
    at?: string;
  }): Promise<{ closed: FinancialShift; successor: FinancialShift }> {
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const result = acceptHandover({
      outgoing: current,
      acceptingUserId: input.acceptingUserId,
      successorShiftId: newCrmpId("fsh"),
      successorDrawerId: newCrmpId("drw"),
      successorOpeningMovementId: newCrmpId("mov"),
      acceptedAt: input.at ?? new Date().toISOString(),
    });
    await this.uow.shifts.save(result.closed);
    await this.uow.shifts.insert(result.successor);
    return result;
  }

  async getExpectedCash(
    restaurantId: number,
    financialShiftId: string
  ): Promise<string> {
    const shift = await this.requireShift(restaurantId, financialShiftId);
    return computeExpectedCash(shift);
  }

  async get(
    restaurantId: number,
    financialShiftId: string
  ): Promise<FinancialShift | null> {
    return this.uow.shifts.findById(restaurantId, financialShiftId);
  }

  private async requireShift(
    restaurantId: number,
    financialShiftId: string
  ): Promise<FinancialShift> {
    const row = await this.uow.shifts.findById(restaurantId, financialShiftId);
    if (!row) {
      throw new CrmpNotFoundError(
        `Financial Shift not found: ${financialShiftId}`
      );
    }
    return row;
  }
}
