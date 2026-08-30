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

export type FinancialShiftArchiveListQuery = Readonly<{
  restaurantId: number;
  registerId?: string;
  /** Inclusive ISO lower bound on closedAt (or openedAt if still open — rare). */
  fromIso?: string;
  toIso?: string;
  status?: readonly string[];
  shiftNumber?: number;
  operatorUserId?: number;
  /** Substring match on financialShiftId (admin). */
  financialShiftIdQuery?: string;
  limit: number;
  offset: number;
}>;

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
  /**
   * Shifts whose lifetime may cover committedAt on this Register.
   * Returns 0..N — never LIMIT 1 / latest. Caller classifies uniqueness.
   */
  findCoveringByRegister(
    restaurantId: number,
    registerId: string,
    committedAt: string
  ): Promise<FinancialShift[]>;
  /**
   * Shifts whose lifetime may cover committedAt for this operator.
   * Returns 0..N — never LIMIT 1 / latest. Caller classifies uniqueness.
   */
  findCoveringByOperator(
    restaurantId: number,
    operatorUserId: number,
    committedAt: string
  ): Promise<FinancialShift[]>;
  listByRegister(
    restaurantId: number,
    registerId: string
  ): Promise<FinancialShift[]>;
  /** Next human shift number for restaurant+register (immutable allocator). */
  allocateNextShiftNumber(
    restaurantId: number,
    registerId: string
  ): Promise<number>;
  /** Archive browse — closed/archived shifts, newest closedAt first. */
  listArchive(
    query: FinancialShiftArchiveListQuery
  ): Promise<{ rows: FinancialShift[]; total: number }>;
  findAttributionBySettlementRecordId(
    restaurantId: number,
    settlementRecordId: string
  ): Promise<SettlementAttribution | null>;
  findAttributionByCollectionFactId(
    restaurantId: number,
    collectionFactId: string
  ): Promise<SettlementAttribution | null>;
};

export type CrmpCloseCorridorCommit = Readonly<{
  shift: FinancialShift;
  shiftExpectedVersion: number;
  register?: CashRegister | null;
  registerExpectedVersion?: number;
}>;

export type CrmpOpenShiftCommit = Readonly<{
  restaurantId: number;
  registerId: string;
  createShift: (shiftNumber: number) => FinancialShift;
}>;

export type CrmpUnitOfWork = {
  registers: CrmpRegisterRepository;
  shifts: CrmpFinancialShiftRepository;
  /**
   * Allocate shiftNumber + persist new shift graph on one connection.
   * Must not reopen an existing Financial Shift row.
   */
  commitOpenShift(input: CrmpOpenShiftCommit): Promise<FinancialShift>;
  /**
   * REGISTER-CLOSE-IDEMPOTENT-ATOMIC-CORRIDOR-1
   * Persist closed shift graph and optional duty close in one unit.
   */
  commitCloseCorridor(input: CrmpCloseCorridorCommit): Promise<void>;
};
