/**
 * SETTLEMENT-CONTEXT-ADOPTION-1 — async Settlement Context resolver (CRMP facts).
 * Fail-open: never throws into Check settle. Never fabricates Register/Shift.
 */

import {
  resolveSettlementContextFromFacts,
  unavailableSettlementContext,
  type SettlementContext,
  type SettlementContextHints,
} from "@shared/crmp";
import type { CrmpUnitOfWork } from "./CrmpRepository";
import { createDrizzleCrmpUnitOfWork } from "./DrizzleCrmpRepository";

export class SettlementContextResolver {
  constructor(private readonly uow: CrmpUnitOfWork) {}

  async resolve(
    input: SettlementContextHints & { restaurantId: number; at?: string }
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

      let activeShiftsForOperator: Awaited<
        ReturnType<CrmpUnitOfWork["shifts"]["findActiveByOperator"]>
      > = [];
      if (
        !candidateRegisterId &&
        input.operatorUserId != null &&
        input.operatorUserId > 0
      ) {
        activeShiftsForOperator = await this.uow.shifts.findActiveByOperator(
          input.restaurantId,
          input.operatorUserId
        );
        if (activeShiftsForOperator.length === 1) {
          candidateRegisterId = activeShiftsForOperator[0]!.registerId;
        }
      }

      const activeShiftOnRegister = candidateRegisterId
        ? await this.uow.shifts.findActiveByRegister(
            input.restaurantId,
            candidateRegisterId
          )
        : null;

      return resolveSettlementContextFromFacts({
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
    } catch {
      return unavailableSettlementContext(input.restaurantId, resolvedAt, [
        "crmp_resolution_error",
      ]);
    }
  }
}

/**
 * Production settle helper — Drizzle UoW; fail-open on any error.
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
