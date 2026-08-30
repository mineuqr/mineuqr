/**
 * CRMP / ADR-ARCH-028 · ADR-ARCH-030 — server barrel.
 * Domain + Settlement Context/Attribution + Register Operations API (CRMP-OPERATIONS-API-1).
 */

export type {
  CrmpRegisterRepository,
  CrmpFinancialShiftRepository,
  CrmpUnitOfWork,
} from "./CrmpRepository";
export { createInMemoryCrmpStore } from "./InMemoryCrmpStore";
export { createDrizzleCrmpUnitOfWork } from "./DrizzleCrmpRepository";
export { RegisterDomainService } from "./RegisterDomainService";
export {
  FinancialShiftDomainService,
  type FinancialShiftCommandResult,
} from "./FinancialShiftDomainService";
export { DrawerDomainService } from "./DrawerDomainService";
export {
  SettlementContextResolver,
  resolveSettlementContextForSettle,
  resolveSettlementContextForCollectionFact,
} from "./SettlementContextResolver";
export { newCrmpId } from "./crmpIds";
