/**
 * CRMP-OPERATIONS-API-1 — operational API contracts.
 * Hide aggregate events, persistence rows, and domain internals.
 */

export const CRMP_OPERATIONS_API_CONTRACT_ID = "CRMP-OPERATIONS-API-1" as const;
export const CRMP_OPERATIONS_API_CONTRACT_VERSION = "1.0.0" as const;

/** Catalog plane — operational label. */
export type RegisterCatalogStatusDto = "provisioned" | "active" | "inactive";

/** Duty plane — operational label. */
export type RegisterDutyStatusDto = "closed" | "open" | "suspended";

export type RegisterDto = Readonly<{
  registerId: string;
  restaurantId: number;
  displayName: string;
  catalogStatus: RegisterCatalogStatusDto;
  dutyStatus: RegisterDutyStatusDto;
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
