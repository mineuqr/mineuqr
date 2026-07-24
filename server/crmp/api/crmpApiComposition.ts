/**
 * CRMP-OPERATIONS-API-1 — composition root.
 * Wires Drizzle UoW → domain services. No domain rules here.
 */

import { createDrizzleCrmpUnitOfWork } from "../DrizzleCrmpRepository";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import { RegisterDomainService } from "../RegisterDomainService";
import { CrmpFinancialShiftOperationsService } from "./crmpFinancialShiftOperationsService";
import { CrmpRegisterCatalogService } from "./crmpRegisterCatalogService";
import { CrmpRegisterOperationsService } from "./crmpRegisterOperationsService";
import type { CrmpUnitOfWork } from "../CrmpRepository";

let uowOverride: CrmpUnitOfWork | null = null;

/** Test seam — inject in-memory UoW without touching production wiring. */
export function setCrmpApiUnitOfWorkForTests(uow: CrmpUnitOfWork | null): void {
  uowOverride = uow;
}

function getUnitOfWork(): CrmpUnitOfWork {
  return uowOverride ?? createDrizzleCrmpUnitOfWork();
}

export function getCrmpRegisterOperationsService(): CrmpRegisterOperationsService {
  const uow = getUnitOfWork();
  return new CrmpRegisterOperationsService(
    new RegisterDomainService(uow),
    new FinancialShiftDomainService(uow)
  );
}

export function getCrmpRegisterCatalogService(): CrmpRegisterCatalogService {
  const uow = getUnitOfWork();
  return new CrmpRegisterCatalogService(new RegisterDomainService(uow));
}

export function getCrmpFinancialShiftOperationsService(): CrmpFinancialShiftOperationsService {
  const uow = getUnitOfWork();
  return new CrmpFinancialShiftOperationsService(
    new FinancialShiftDomainService(uow)
  );
}
