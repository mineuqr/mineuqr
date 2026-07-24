/**
 * CRMP / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — repository ports (no business logic).
 */

import type {
  CashRegister,
  FinancialShift,
  SettlementAttribution,
} from "@shared/crmp";

export type CrmpRegisterRepository = {
  insert(register: CashRegister): Promise<void>;
  /** Optimistic concurrency when expectedVersion is supplied. */
  update(register: CashRegister, expectedVersion?: number): Promise<void>;
  findById(
    restaurantId: number,
    registerId: string
  ): Promise<CashRegister | null>;
  listByRestaurant(restaurantId: number): Promise<CashRegister[]>;
};

export type CrmpFinancialShiftRepository = {
  insert(shift: FinancialShift): Promise<void>;
  /** Full replace of shift aggregate graph (shift + drawer children + handover + attributions). */
  save(shift: FinancialShift, expectedVersion?: number): Promise<void>;
  findById(
    restaurantId: number,
    financialShiftId: string
  ): Promise<FinancialShift | null>;
  findActiveByRegister(
    restaurantId: number,
    registerId: string
  ): Promise<FinancialShift | null>;
  findActiveByOperator(
    restaurantId: number,
    operatorUserId: number
  ): Promise<FinancialShift[]>;
  listByRegister(
    restaurantId: number,
    registerId: string
  ): Promise<FinancialShift[]>;
  findAttributionBySettlementRecordId(
    restaurantId: number,
    settlementRecordId: string
  ): Promise<SettlementAttribution | null>;
};

export type CrmpUnitOfWork = {
  registers: CrmpRegisterRepository;
  shifts: CrmpFinancialShiftRepository;
};
