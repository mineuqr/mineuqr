/**
 * CRMP / ADR-ARCH-028 · ADR-ARCH-030 — Cash Register Management Platform domain.
 * Pure domain barrel. No Settlement / Check / Reporting imports.
 */

export const CRMP_PROGRAM_ID = "CRMP-IMPLEMENTATION-1" as const;
export const CRMP_ADR_ID = "ADR-ARCH-028" as const;

export * from "./crmpErrors";
export * from "./valueObjects";
export * from "./register/registerContract";
export * from "./register/registerLifecycle";
export * from "./register/registerCommands";
export * from "./register/registerEvents";
export * from "./register/registerResolve";
export * from "./financialShift/financialShiftContract";
export * from "./financialShift/financialShiftLifecycle";
export * from "./financialShift/expectedCash";
export * from "./financialShift/financialShiftCommands";
export * from "./financialShift/financialShiftEvents";
export * from "./financialShift/financialShiftResolve";
export * from "./settlementContext/settlementContextContract";
export * from "./settlementContext/resolveSettlementContext";
export * from "./settlementContext/settlementAttributionAdoption";
export * from "./financialShift/settlementAttributedEvent";
