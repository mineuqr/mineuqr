/**
 * REPORTING-KPI-GOVERNANCE-1 — KPI catalog (metadata only).
 * Does not compute KPI values; does not change business formulas.
 */
import type { KpiCatalogDto } from "@shared/reporting-platform";
import {
  KPI_GOVERNANCE_PROGRAM_ID,
  REPORTING_CONTRACT_VERSION,
  listKpiMetadata,
} from "@shared/reporting-platform";

export function getKpiCatalog(now: Date = new Date()): KpiCatalogDto {
  const meta = listKpiMetadata();
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "KpiCatalog",
    programId: KPI_GOVERNANCE_PROGRAM_ID,
    generatedAt: now.toISOString(),
    kpis: meta.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      owner: k.owner,
      ownerDomain: k.ownerDomain,
      calculationVersion: k.calculationVersion,
      source: k.source,
      sourceService: k.sourceService,
      sourceDto: k.sourceDto,
      dtoField: k.dtoField,
      unit: k.unit,
      category: k.category,
      formula: k.formula,
      aggregation: k.aggregation,
      availability: k.availability,
      dependsOn: k.dependsOn,
    })),
  };
}
