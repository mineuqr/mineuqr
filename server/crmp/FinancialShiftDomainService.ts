/**
 * ADR-ARCH-030 / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Financial Shift domain service.
 * Owns lifecycle / drawer / handover coordination. Does NOT call Settlement / Check.
 * Events are collected facts (no bus/outbox in this program).
 */

import {
  abortCloseFinancialShift,
  acceptHandover,
  archiveFinancialShift,
  beginCloseFinancialShift,
  buildFinancialShiftArchivedEvent,
  buildFinancialShiftClosedEvent,
  buildFinancialShiftClosingStartedEvent,
  buildFinancialShiftOpenedEvent,
  buildFinancialShiftResumedEvent,
  buildFinancialShiftSuspendedEvent,
  cancelOpenFinancialShift,
  closeFinancialShift,
  createSettlementAttribution,
  initiateHandover,
  openFinancialShift,
  recordDrawerCount,
  recordDrawerMovement,
  rejectHandover,
  resolveActiveFinancialShift,
  resolveFinancialShiftByOperator,
  resolveFinancialShiftByRegister,
  resumeFinancialShift,
  suspendFinancialShift,
  type FinancialShift,
  type FinancialShiftDomainEvent,
  type MovementType,
  type SettlementAttribution,
  CrmpConflictError,
  CrmpNotFoundError,
  computeExpectedCash,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { newCrmpId } from "./crmpIds";

export type FinancialShiftCommandResult = Readonly<{
  shift: FinancialShift;
  events: readonly FinancialShiftDomainEvent[];
  alreadyApplied?: boolean;
}>;

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
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const financialShiftId = input.financialShiftId ?? newCrmpId("fsh");
    const existing = await this.uow.shifts.findById(
      input.restaurantId,
      financialShiftId
    );
    if (existing) {
      return {
        shift: existing,
        events: [],
        alreadyApplied: true,
      };
    }
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
      financialShiftId,
      drawerId: newCrmpId("drw"),
      openingMovementId: newCrmpId("mov"),
      register,
      hasActiveShiftOnRegister: active != null,
      restaurantId: input.restaurantId,
      operatorUserId: input.operatorUserId,
      openingFloatAmount: input.openingFloatAmount,
      currencyCode: input.currencyCode,
      openedAt: at,
      existingById: null,
    });
    await this.uow.shifts.insert(shift);
    return {
      shift,
      events: [buildFinancialShiftOpenedEvent(shift, at)],
      alreadyApplied: false,
    };
  }

  async suspend(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = suspendFinancialShift({ shift: current, at });
    if (next === current || next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftSuspendedEvent(next, at)],
    };
  }

  async resume(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = resumeFinancialShift({ shift: current, at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftResumedEvent(next, at)],
    };
  }

  async beginClose(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = beginCloseFinancialShift({ shift: current, at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftClosingStartedEvent(next, at)],
    };
  }

  async abortClose(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = abortCloseFinancialShift({ shift: current, at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return { shift: next, events: [] };
  }

  async close(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = closeFinancialShift({ shift: current, closedAt: at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftClosedEvent(next, at)],
    };
  }

  async cancelOpen(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = cancelOpenFinancialShift({ shift: current, closedAt: at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftClosedEvent(next, at)],
    };
  }

  async archive(input: {
    restaurantId: number;
    financialShiftId: string;
    at?: string;
    expectedVersion?: number;
  }): Promise<FinancialShiftCommandResult> {
    const at = input.at ?? new Date().toISOString();
    const current = await this.requireShift(
      input.restaurantId,
      input.financialShiftId
    );
    const next = archiveFinancialShift({ shift: current, archivedAt: at });
    if (next.version === current.version) {
      return { shift: current, events: [], alreadyApplied: true };
    }
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return {
      shift: next,
      events: [buildFinancialShiftArchivedEvent(next, at)],
    };
  }

  async resolveActive(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShift | null> {
    return this.uow.shifts.findActiveByRegister(
      input.restaurantId,
      input.registerId
    );
  }

  async resolveByRegister(input: {
    restaurantId: number;
    registerId: string;
    includeClosed?: boolean;
  }): Promise<FinancialShift | null> {
    const listed = await this.uow.shifts.listByRegister(
      input.restaurantId,
      input.registerId
    );
    return resolveFinancialShiftByRegister(listed, input.registerId, {
      includeClosed: input.includeClosed,
    });
  }

  async resolveByOperator(input: {
    restaurantId: number;
    operatorUserId: number;
  }): Promise<FinancialShift | null> {
    const active = await this.uow.shifts.findActiveByOperator(
      input.restaurantId,
      input.operatorUserId
    );
    return resolveFinancialShiftByOperator(active, input.operatorUserId);
  }

  /** @deprecated Prefer resolveActive — kept for call-site clarity. */
  async resolveActiveFinancialShift(input: {
    restaurantId: number;
    registerId: string;
  }): Promise<FinancialShift | null> {
    const listed = await this.uow.shifts.listByRegister(
      input.restaurantId,
      input.registerId
    );
    return resolveActiveFinancialShift(listed);
  }

  async recordMovement(input: {
    restaurantId: number;
    financialShiftId: string;
    movementType: Exclude<MovementType, "opening_float">;
    amount: string;
    reason: string | null;
    actorUserId: number;
    at?: string;
    expectedVersion?: number;
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
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return next;
  }

  async recordCount(input: {
    restaurantId: number;
    financialShiftId: string;
    kind: "interim" | "final";
    actualAmount: string;
    actorUserId: number;
    at?: string;
    expectedVersion?: number;
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
    await this.uow.shifts.save(next, input.expectedVersion ?? current.version);
    return next;
  }

  /**
   * Domain attribution. Caller supplies settlementRecordId + cashTenderAmount
   * (custody copy). Settled via SETTLEMENT-ATTRIBUTION-ADOPTION-1 post-commit.
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
      await this.uow.shifts.save(result.shift, current.version);
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
    await this.uow.shifts.save(next, current.version);
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
    await this.uow.shifts.save(next, current.version);
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
    await this.uow.shifts.save(result.closed, current.version);
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

  /** Concurrent save probe — throws CrmpConflictError on version mismatch. */
  async assertVersion(
    restaurantId: number,
    financialShiftId: string,
    expectedVersion: number
  ): Promise<void> {
    const current = await this.requireShift(restaurantId, financialShiftId);
    if (current.version !== expectedVersion) {
      throw new CrmpConflictError(
        `Financial Shift version conflict: expected ${expectedVersion}, found ${current.version}`
      );
    }
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
