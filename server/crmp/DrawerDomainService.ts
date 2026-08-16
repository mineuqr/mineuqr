/**
 * CRMP-IMPLEMENTATION-1 — Drawer domain façade.
 * Drawer is owned by Financial Shift; this service delegates custody commands.
 */

import type { FinancialShift, MovementType } from "@shared/crmp";
import type { FinancialShiftDomainService } from "./FinancialShiftDomainService";

export class DrawerDomainService {
  constructor(private readonly shifts: FinancialShiftDomainService) {}

  async recordMovement(input: {
    restaurantId: number;
    financialShiftId: string;
    movementType: Exclude<MovementType, "opening_float">;
    amount: string;
    reason: string | null;
    actorUserId: number;
    at?: string;
    movementId?: string;
  }): Promise<FinancialShift> {
    const result = await this.shifts.recordMovement(input);
    return result.shift;
  }

  recordCount(input: {
    restaurantId: number;
    financialShiftId: string;
    kind: "interim" | "final";
    actualAmount: string;
    actorUserId: number;
    at?: string;
  }): Promise<FinancialShift> {
    return this.shifts.recordCount(input);
  }

  expectedCash(
    restaurantId: number,
    financialShiftId: string
  ): Promise<string> {
    return this.shifts.getExpectedCash(restaurantId, financialShiftId);
  }
}
