/**
 * REPORTING-PRODUCT-SEMANTICS-1 — presentation labels from canonical terminology.
 * REPORTING-KPI-GOVERNANCE-1 — KPI ids unchanged; values never calculated here.
 */
import {
  preferredKpiLabel,
  type KpiId,
  type PresentationLanguage,
} from "@shared/reporting-platform";

/** Canonical display name for restaurant users. */
export function kpiDisplayName(
  id: KpiId,
  language: PresentationLanguage
): string {
  return preferredKpiLabel(id, language);
}
