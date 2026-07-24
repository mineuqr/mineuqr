/**
 * CRMP-OPERATIONS-API-1 / REGISTER-CATALOG-MANAGEMENT-1 — operational API contracts.
 * Hide aggregate events, persistence rows, and domain internals.
 */

export const CRMP_OPERATIONS_API_CONTRACT_ID = "CRMP-OPERATIONS-API-1" as const;
export const CRMP_OPERATIONS_API_CONTRACT_VERSION = "1.0.0" as const;

/** Catalog plane — operational label. */
export type RegisterCatalogStatusDto = "provisioned" | "active" | "inactive";

/** Duty plane — operational label. */
export type RegisterDutyStatusDto = "closed" | "open" | "suspended";

export type RegisterTypeDto =
  | "settlement_station"
  | "counter"
  | "mobile_pos";

export type RegisterDto = Readonly<{
  registerId: string;
  restaurantId: number;
  code: string;
  displayName: string;
  registerType: RegisterTypeDto;
  catalogStatus: RegisterCatalogStatusDto;
  dutyStatus: RegisterDutyStatusDto;
  archivedAt: string | null;
  deviceId: string | null;
  assignedOperatorUserId: number | null;
  operatorAssignedAt: string | null;
  /** Optimistic concurrency token for subsequent commands. */
  version: number;
  updatedAt: string;
}>;

export type RegisterCommandResultDto = Readonly<{
  register: RegisterDto;
  alreadyApplied: boolean;
}>;

/** Lightweight Financial Shift reference — not the full custody aggregate. */
export type FinancialShiftRefDto = Readonly<{
  financialShiftId: string;
  registerId: string;
  restaurantId: number;
  status: string;
  operatorUserId: number;
  openedAt: string;
  closedAt: string | null;
  version: number;
}>;

/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — operational Shift view for Ops UI.
 * Amounts are opaque decimal strings from the domain (no recalculation in API).
 */
export type FinancialShiftViewDto = Readonly<{
  financialShiftId: string;
  registerId: string;
  restaurantId: number;
  status: string;
  operatorUserId: number;
  openedAt: string;
  closedAt: string | null;
  version: number;
  openingFloatAmount: string;
  currencyCode: string;
  /** Domain expected cash (OpeningFloat + movements + attributed cash). */
  expectedCashAmount: string;
  /** Present after a final drawer count (close workflow). */
  finalCount: Readonly<{
    expectedAmount: string;
    actualAmount: string;
    varianceAmount: string;
  }> | null;
}>;

export type FinancialShiftCommandResultDto = Readonly<{
  shift: FinancialShiftViewDto;
  alreadyApplied: boolean;
}>;

/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — shift-scoped tender summary.
 * Built from Attribution membership → Settlement Record payment snapshots.
 * Bucket rules reused from REPORTING-PAYMENT-METHOD-ANALYTICS-1 (no UI math).
 * Not Expected Cash. Not Check Revenue.
 */
export type FinancialShiftTenderMethodAmountDto = Readonly<{
  paymentMethod: string;
  amount: string;
  transactionCount: number;
}>;

export type FinancialShiftTenderSummaryDto = Readonly<{
  financialShiftId: string;
  registerId: string;
  restaurantId: number;
  attributedSettlementCount: number;
  /** Σ captured monetary tenders on attributed Settlement Records. */
  monetaryTenderTotal: string;
  cashTenderTotal: string;
  complimentaryAmount: string;
  /** Σ grandTotal on attributed Settlement Records with recordKind=refund. */
  refundAmount: string;
  methods: readonly FinancialShiftTenderMethodAmountDto[];
}>;

export type CurrentRegisterViewDto = Readonly<{
  register: RegisterDto;
  dutyStatus: RegisterDutyStatusDto;
  operatorUserId: number | null;
  deviceId: string | null;
  financialShift: FinancialShiftRefDto | null;
}>;

export type RegisterHistoryDto = Readonly<{
  registerId: string;
  restaurantId: number;
  shifts: readonly FinancialShiftRefDto[];
}>;
