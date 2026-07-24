/**
 * CRMP-IMPLEMENTATION-1 / ADR-ARCH-028 — Cash Register Management Platform domain.
 * Pure domain barrel. No Settlement / Check / Reporting imports.
 */

export const CRMP_PROGRAM_ID = "CRMP-IMPLEMENTATION-1" as const;
export const CRMP_ADR_ID = "ADR-ARCH-028" as const;

export * from "./crmpErrors";
export * from "./valueObjects";
export * from "./register/registerContract";
export * from "./register/registerLifecycle";
export * from "./register/registerCommands";
export * from "./financialShift/financialShiftContract";
export * from "./financialShift/financialShiftLifecycle";
export * from "./financialShift/expectedCash";
export * from "./financialShift/financialShiftCommands";
