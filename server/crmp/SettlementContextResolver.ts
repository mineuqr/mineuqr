/**
 * SETTLEMENT-CONTEXT-ADOPTION-1 — async Settlement Context resolver (CRMP facts).
 * Fail-open: never throws into Check settle. Never fabricates Register/Shift.
 *
 * CASH-DRAWER-SHIFT-ATTRIBUTION-CONSISTENCY-FIX-1
 * Collection-Fact resolution asks which Shift covered CF.committedAt.
 * Live settle / refund keep current-active resolution.
 */

import {
  classifyShiftsCoveringCommitTime,
  resolveSettlementContextFromFacts,
  shiftIsMutable,
  unavailableSettlementContext,
  type FinancialShift,
  type SettlementContext,
  type SettlementContextHints,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { createDrizzleCrmpUnitOfWork } from "./DrizzleCrmpRepository";

type ResolveMode =
  | { readonly kind: "active_now" }
  | { readonly kind: "as_of_commit"; readonly committedAt: string };

export class SettlementContextResolver {
  constructor(private readonly uow: CrmpUnitOfWork) {}

  async resolve(
    input: SettlementContextHints & { restaurantId: number; at?: string }
  ): Promise<SettlementContext> {
    return this.resolveInternal(input, { kind: "active_now" });
  }

  /**
   * CF → Drawer context. Shift membership is the lifetime covering committedAt.
   * Current open Shift is used only when that lifetime matches.
   */
  async resolveForCollectionFact(
    input: SettlementContextHints & {
      restaurantId: number;
      committedAt: string;
    }
  ): Promise<SettlementContext> {
    const committedAt = input.committedAt.trim();
    if (!committedAt) {
      return unavailableSettlementContext(
        input.restaurantId,
        new Date().toISOString(),
        ["collection_fact_commit_time_invalid"]
      );
    }
    return this.resolveInternal(
      { ...input, at: committedAt },
      { kind: "as_of_commit", committedAt }
    );
  }

  private async resolveInternal(
    input: SettlementContextHints & { restaurantId: number; at?: string },
    mode: ResolveMode
  ): Promise<SettlementContext> {
    const resolvedAt = input.at ?? new Date().toISOString();
    try {
      const registers = await this.uow.registers.listByRestaurant(
        input.restaurantId
      );

      let candidateRegisterId = input.registerId?.trim() || null;
      if (!candidateRegisterId && input.deviceId?.trim()) {
        const matches = registers.filter(
          (r) => r.deviceId === input.deviceId!.trim()
        );
        if (matches.length === 1) {
          candidateRegisterId = matches[0]!.registerId;
        }
      }

      const extraGaps: string[] = [];
      let activeShiftsForOperator: FinancialShift[] = [];
      if (
        !candidateRegisterId &&
        input.operatorUserId != null &&
        input.operatorUserId > 0
      ) {
        if (mode.kind === "as_of_commit") {
          const covering = await this.uow.shifts.findCoveringByOperator(
            input.restaurantId,
            input.operatorUserId,
            mode.committedAt
          );
          const classified = classifyShiftsCoveringCommitTime(
            covering,
            mode.committedAt
          );
          if (classified.kind === "unique") {
            candidateRegisterId = classified.shift.registerId;
            activeShiftsForOperator = [classified.shift];
          } else if (classified.kind === "ambiguous") {
            extraGaps.push("ambiguous_shift_at_commit_time");
          }
        } else {
          activeShiftsForOperator = await this.uow.shifts.findActiveByOperator(
            input.restaurantId,
            input.operatorUserId
          );
          if (activeShiftsForOperator.length === 1) {
            candidateRegisterId = activeShiftsForOperator[0]!.registerId;
          }
        }
      }

      let activeShiftOnRegister: FinancialShift | null = null;
      if (candidateRegisterId && mode.kind === "active_now") {
        activeShiftOnRegister = await this.uow.shifts.findActiveByRegister(
          input.restaurantId,
          candidateRegisterId
        );
      } else if (candidateRegisterId && mode.kind === "as_of_commit") {
        const covering = await this.uow.shifts.findCoveringByRegister(
          input.restaurantId,
          candidateRegisterId,
          mode.committedAt
        );
        const classified = classifyShiftsCoveringCommitTime(
          covering,
          mode.committedAt
        );
        if (classified.kind === "unique") {
          if (shiftIsMutable(classified.shift.status)) {
            activeShiftOnRegister = classified.shift;
            if (activeShiftsForOperator.length === 0) {
              activeShiftsForOperator = [classified.shift];
            }
          } else {
            extraGaps.push("shift_not_writable_for_attribution");
          }
        } else if (classified.kind === "none") {
          extraGaps.push("no_shift_at_commit_time");
        } else {
          extraGaps.push("ambiguous_shift_at_commit_time");
        }
      }

      const ctx = resolveSettlementContextFromFacts({
        restaurantId: input.restaurantId,
        resolvedAt,
        hints: {
          registerId: input.registerId,
          deviceId: input.deviceId,
          operatorUserId: input.operatorUserId,
          operationalScreenId: input.operationalScreenId,
        },
        registers,
        activeShiftOnRegister,
        activeShiftsForOperator,
      });
      if (extraGaps.length === 0) return ctx;
      const gaps = [...ctx.gaps, ...extraGaps];
      return { ...ctx, gaps };
    } catch {
      return unavailableSettlementContext(input.restaurantId, resolvedAt, [
        "crmp_resolution_error",
      ]);
    }
  }
}

/**
 * Production settle helper — Drizzle UoW; fail-open on any error.
 * Live settle / refund: current active Shift.
 */
export async function resolveSettlementContextForSettle(
  input: SettlementContextHints & { restaurantId: number; at?: string }
): Promise<SettlementContext> {
  try {
    const resolver = new SettlementContextResolver(createDrizzleCrmpUnitOfWork());
    return await resolver.resolve(input);
  } catch {
    return unavailableSettlementContext(
      input.restaurantId,
      input.at ?? new Date().toISOString(),
      ["crmp_resolution_error"]
    );
  }
}

/**
 * Production CF → Drawer helper. Resolves the Shift covering committedAt.
 */
export async function resolveSettlementContextForCollectionFact(
  input: SettlementContextHints & {
    restaurantId: number;
    committedAt: string;
  }
): Promise<SettlementContext> {
  try {
    const resolver = new SettlementContextResolver(createDrizzleCrmpUnitOfWork());
    return await resolver.resolveForCollectionFact(input);
  } catch {
    return unavailableSettlementContext(
      input.restaurantId,
      input.committedAt.trim() || new Date().toISOString(),
      ["crmp_resolution_error"]
    );
  }
}
