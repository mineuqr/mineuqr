/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 /
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — thin application orchestration.
 * Auth / validation live in the router. Domain rules stay in domain services.
 * DRAP owns display-window policy; Shift remains Aggregate Root.
 */

import { CrmpConflictError, CrmpNotFoundError, CrmpValidationError } from "@shared/crmp";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import type { RegisterDomainService } from "../RegisterDomainService";
import {
  ensureFinancialShiftRetentionAdapter,
  getFinancialShiftDrapPlatform,
  resolveFinancialShiftDisplayWindow,
  type ShiftArchiveWindowPreset,
} from "../retention/financialShiftDrapAdoption";
import type {
  DrawerMovementCommandResultDto,
  FinancialShiftArchiveListDto,
  FinancialShiftClosingReportDto,
  FinancialShiftCommandResultDto,
  FinancialShiftTenderSummaryDto,
  FinancialShiftViewDto,
} from "./crmpApiDtos";
import {
  toDrawerMovementCommandResultDto,
  toFinancialShiftCommandResultDto,
} from "./crmpApiMapper";
import { drawerMovementIdForRetry, drawerCountIdForCloseRetry } from "./crmpDrawerMovementId";
import {
  buildFinancialShiftTenderSummary,
  type SettlementRecordBatchLoader,
} from "./crmpFinancialShiftTenderSummary";

function parseReportingDiff(expected: string, actual: string): string {
  const e = Number(expected);
  const a = Number(actual);
  if (!Number.isFinite(e) || !Number.isFinite(a)) return "0.00";
  return (a - e).toFixed(2);
}

export class CrmpFinancialShiftOperationsService {
  constructor(
    private readonly shifts: FinancialShiftDomainService,
    private readonly registers?: RegisterDomainService,
    private readonly loadSettlementRecords?: SettlementRecordBatchLoader
  ) {
    ensureFinancialShiftRetentionAdapter(shifts);
  }

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
   * REGISTER-CLOSE-IDEMPOTENT-ATOMIC-CORRIDOR-1
   * Load current shift → reuse or record matching final count → close shift
   * → optional duty close, in one UoW commit.
   */
  async close(input: {
    restaurantId: number;
    financialShiftId: string;
    actualCashAmount: string;
    actorUserId: number;
    expectedVersion?: number;
    at?: string;
    closeIdempotencyKey?: string;
    closeDuty?: boolean;
  }): Promise<FinancialShiftCommandResultDto> {
    const current = await this.shifts.get(
      input.restaurantId,
      input.financialShiftId
    );
    const countId =
      current && input.closeIdempotencyKey
        ? drawerCountIdForCloseRetry({
            restaurantId: input.restaurantId,
            registerId: current.registerId,
            financialShiftId: input.financialShiftId,
            actorUserId: input.actorUserId,
            idempotencyKey: input.closeIdempotencyKey,
          })
        : undefined;
    const result = await this.shifts.closeWithFinalCount({
      restaurantId: input.restaurantId,
      financialShiftId: input.financialShiftId,
      actualCashAmount: input.actualCashAmount,
      actorUserId: input.actorUserId,
      at: input.at,
      expectedVersion: input.expectedVersion,
      closeDuty: input.closeDuty === true,
      countId,
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

  async archive(input: {
    restaurantId: number;
    financialShiftId: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<FinancialShiftCommandResultDto> {
    const result = await this.shifts.archive(input);
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

  async listArchive(input: {
    restaurantId: number;
    preset?: ShiftArchiveWindowPreset;
    customFromIso?: string;
    customToIso?: string;
    registerId?: string;
    shiftNumber?: number;
    operatorUserId?: number;
    financialShiftIdQuery?: string;
    status?: readonly string[];
    limit?: number;
    offset?: number;
  }): Promise<FinancialShiftArchiveListDto> {
    const preset = input.preset ?? "last_30";
    const window = resolveFinancialShiftDisplayWindow({
      restaurantId: input.restaurantId,
      preset,
      customFromIso: input.customFromIso,
      customToIso: input.customToIso,
    });
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);
    const { rows, total } = await this.shifts.listArchive({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
      fromIso: window.fromIso,
      toIso: window.toIso,
      shiftNumber: input.shiftNumber,
      operatorUserId: input.operatorUserId,
      financialShiftIdQuery: input.financialShiftIdQuery,
      status: input.status,
      limit,
      offset,
    });

    const drap = getFinancialShiftDrapPlatform();
    const items = [];
    for (const shift of rows) {
      const register = this.registers
        ? await this.registers.get(input.restaurantId, shift.registerId)
        : null;
      const expectedCashAmount = await this.shifts.getExpectedCash(
        input.restaurantId,
        shift.financialShiftId
      );
      const final =
        [...shift.drawer.counts].reverse().find((c) => c.kind === "final") ??
        null;
      const eligibility = drap.evaluate({
        subject: {
          restaurantId: shift.restaurantId,
          entityType: "financial_shift",
          entityId: shift.financialShiftId,
        },
        timestamps: {
          referenceAt: shift.closedAt ?? shift.openedAt,
          archivedAt: shift.archivedAt,
        },
        currentState:
          shift.status === "archived" ? "ARCHIVED" : "DISPLAY_WINDOW",
        nowIso: new Date().toISOString(),
        entityOpen: false,
      });
      items.push({
        financialShiftId: shift.financialShiftId,
        shiftNumber: shift.shiftNumber,
        registerId: shift.registerId,
        registerName: register?.displayName ?? shift.registerId,
        restaurantId: shift.restaurantId,
        status: shift.status,
        operatorUserId: shift.operatorUserId,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        archivedAt: shift.archivedAt,
        openingFloatAmount: shift.openingFloatAmount,
        expectedCashAmount,
        actualCashAmount: final?.actualAmount ?? null,
        currencyCode: shift.currencyCode,
        inDisplayWindow: eligibility.inDisplayWindow,
      });
    }

    return {
      items,
      total,
      displayWindowDays: window.displayWindowDays,
      preset,
    };
  }

  async getClosingReport(input: {
    restaurantId: number;
    financialShiftId: string;
  }): Promise<FinancialShiftClosingReportDto> {
    const shift = await this.shifts.get(
      input.restaurantId,
      input.financialShiftId
    );
    if (!shift) {
      throw new CrmpNotFoundError(
        `Financial Shift not found: ${input.financialShiftId}`
      );
    }
    if (shift.status !== "closed" && shift.status !== "archived") {
      throw new CrmpNotFoundError(
        "Closing report is available for closed or archived shifts only"
      );
    }
    const register = this.registers
      ? await this.registers.get(input.restaurantId, shift.registerId)
      : null;
    const expectedCashAmount = await this.shifts.getExpectedCash(
      input.restaurantId,
      shift.financialShiftId
    );
    const final =
      [...shift.drawer.counts].reverse().find((c) => c.kind === "final") ?? null;
    const actualCashAmount = final?.actualAmount ?? expectedCashAmount;
    const tender = await buildFinancialShiftTenderSummary({
      restaurantId: input.restaurantId,
      registerId: shift.registerId,
      shifts: this.shifts,
      loadSettlementRecords: this.loadSettlementRecords,
      financialShiftId: shift.financialShiftId,
    });

    return {
      financialShiftId: shift.financialShiftId,
      shiftNumber: shift.shiftNumber,
      registerId: shift.registerId,
      registerName: register?.displayName ?? shift.registerId,
      restaurantId: shift.restaurantId,
      operatorUserId: shift.operatorUserId,
      status: shift.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingFloatAmount: shift.openingFloatAmount,
      expectedCashAmount,
      actualCashAmount,
      differenceAmount: parseReportingDiff(expectedCashAmount, actualCashAmount),
      currencyCode: shift.currencyCode,
      settlementsCount: shift.attributions.length,
      tender,
    };
  }

  /**
   * CRMP-DRAWER-MOVEMENT-API-1 — public drawer movement command.
   * Register/Shift are resolved server-side. Actor is the authenticated user.
   */
  async recordDrawerMovement(input: {
    restaurantId: number;
    registerId: string;
    actorUserId: number;
    movementType: "paid_in" | "paid_out" | "safe_drop" | "manual_adjustment";
    amount: string;
    reason: string;
    idempotencyKey: string;
    financialShiftId?: string;
    currencyCode?: string;
    expectedVersion?: number;
    at?: string;
  }): Promise<DrawerMovementCommandResultDto> {
    const register = this.registers
      ? await this.registers.get(input.restaurantId, input.registerId)
      : null;
    if (!register) {
      throw new CrmpNotFoundError(`Register not found: ${input.registerId}`);
    }

    const current = await this.shifts.resolveActive({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
    });
    if (!current) {
      throw new CrmpNotFoundError(
        `No active Financial Shift for register: ${input.registerId}`
      );
    }
    if (
      input.financialShiftId &&
      input.financialShiftId !== current.financialShiftId
    ) {
      throw new CrmpConflictError(
        "Financial Shift does not match the active Register"
      );
    }
    if (
      input.currencyCode &&
      input.currencyCode !== current.currencyCode
    ) {
      throw new CrmpValidationError(
        "currencyCode does not match the Financial Shift"
      );
    }

    const movementId = drawerMovementIdForRetry({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
      financialShiftId: current.financialShiftId,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
    });
    const recorded = await this.shifts.recordMovement({
      restaurantId: input.restaurantId,
      financialShiftId: current.financialShiftId,
      movementType: input.movementType,
      amount: input.amount,
      reason: input.reason,
      actorUserId: input.actorUserId,
      at: input.at,
      expectedVersion: input.expectedVersion,
      movementId,
    });
    const movement = recorded.shift.drawer.movements.find(
      (m) => m.movementId === movementId
    );
    if (!movement) {
      throw new CrmpNotFoundError("Drawer movement was not recorded");
    }
    const expectedCashAmount = await this.shifts.getExpectedCash(
      input.restaurantId,
      recorded.shift.financialShiftId
    );
    return toDrawerMovementCommandResultDto({
      shift: recorded.shift,
      movement,
      expectedCashAmount,
      alreadyApplied: recorded.alreadyApplied,
    });
  }
}
