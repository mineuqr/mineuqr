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
  shiftNumber: number;
  registerId: string;
  restaurantId: number;
  status: string;
  operatorUserId: number;
  openedAt: string;
  closedAt: string | null;
  archivedAt: string | null;
  version: number;
}>;

/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — operational Shift view for Ops UI.
 * Amounts are opaque decimal strings from the domain (no recalculation in API).
 */
export type FinancialShiftViewDto = Readonly<{
  financialShiftId: string;
  shiftNumber: number;
  registerId: string;
  restaurantId: number;
  status: string;
  operatorUserId: number;
  openedAt: string;
  closedAt: string | null;
  archivedAt: string | null;
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

/** FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — archive browse row. */
export type FinancialShiftArchiveItemDto = Readonly<{
  financialShiftId: string;
  shiftNumber: number;
  registerId: string;
  registerName: string;
  restaurantId: number;
  status: string;
  operatorUserId: number;
  openedAt: string;
  closedAt: string | null;
  archivedAt: string | null;
  openingFloatAmount: string;
  expectedCashAmount: string;
  actualCashAmount: string | null;
  currencyCode: string;
  inDisplayWindow: boolean;
}>;

export type FinancialShiftArchiveListDto = Readonly<{
  items: readonly FinancialShiftArchiveItemDto[];
  total: number;
  displayWindowDays: number;
  preset: string;
}>;

export type FinancialShiftCommandResultDto = Readonly<{
  shift: FinancialShiftViewDto;
  alreadyApplied: boolean;
}>;

export const DRAWER_MOVEMENT_API_TYPES = [
  "paid_in",
  "paid_out",
  "safe_drop",
  "manual_adjustment",
] as const;

export type DrawerMovementApiType = (typeof DRAWER_MOVEMENT_API_TYPES)[number];

export type DrawerMovementDto = Readonly<{
  movementId: string;
  movementType: DrawerMovementApiType;
  amount: string;
  currencyCode: string;
  reason: string | null;
  actorUserId: number;
  recordedAt: string;
}>;

export type DrawerMovementCommandResultDto = Readonly<{
  shift: FinancialShiftViewDto;
  movement: DrawerMovementDto;
  alreadyApplied: boolean;
}>;

/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — shift-scoped tender summary.
 * Built from Attribution membership → Collection Fact tenders (current Cashier)
 * or Settlement Record payment snapshots (legacy / refunds).
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

/**
 * Closing report facts for archive reprint — domain-stored amounts only.
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1
 */
export type FinancialShiftClosingReportDto = Readonly<{
  financialShiftId: string;
  shiftNumber: number;
  registerId: string;
  registerName: string;
  restaurantId: number;
  operatorUserId: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingFloatAmount: string;
  expectedCashAmount: string;
  actualCashAmount: string;
  differenceAmount: string;
  currencyCode: string;
  settlementsCount: number;
  tender: FinancialShiftTenderSummaryDto | null;
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
