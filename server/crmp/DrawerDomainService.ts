/**
 * CRMP-IMPLEMENTATION-1 — Drawer domain façade.
 * Drawer is owned by Financial Shift; this service delegates custody commands.
 */

import type { FinancialShift, MovementType } from "@shared/crmp";
import type { FinancialShiftDomainService } from "./FinancialShiftDomainService";

export class DrawerDomainService {
  constructor(private readonly shifts: FinancialShiftDomainService) {}

  recordMovement(input: {
    restaurantId: number;
    financialShiftId: string;
    movementType: Exclude<MovementType, "opening_float">;
    amount: string;
    reason: string | null;
    actorUserId: number;
    at?: string;
  }): Promise<FinancialShift> {
    return this.shifts.recordMovement(input);
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
