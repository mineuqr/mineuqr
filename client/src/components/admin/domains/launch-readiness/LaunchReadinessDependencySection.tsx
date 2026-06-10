/**
 * REBUILD-5G — cross-domain evidence consumption.
 * Launch Readiness owns the decision; other domains own the evidence.
 */
import {
  LAUNCH_READINESS_EVIDENCE_DEPENDENCIES,
  getLaunchReadinessEvidenceBySource,
} from "@/lib/admin/domains/launch-readiness";

export { LAUNCH_READINESS_EVIDENCE_DEPENDENCIES, getLaunchReadinessEvidenceBySource };

export const LAUNCH_READINESS_REPORTS_EVIDENCE =
  getLaunchReadinessEvidenceBySource("reports");

export const LAUNCH_READINESS_CUSTOMER_SUCCESS_EVIDENCE =
  getLaunchReadinessEvidenceBySource("customer-success");

export const LAUNCH_READINESS_SECURITY_EVIDENCE =
  getLaunchReadinessEvidenceBySource("security");

export const LAUNCH_READINESS_HEALTH_EVIDENCE =
  getLaunchReadinessEvidenceBySource("health");

/** Placeholder for future dependency status panel. */
export function LaunchReadinessDependencySection() {
  return null;
}
