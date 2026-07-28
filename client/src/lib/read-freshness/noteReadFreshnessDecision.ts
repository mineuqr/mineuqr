/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Client observability for rejected stale cache merges.
 */
import {
  getReadFreshnessCounters,
  type ReadFreshnessObservation,
} from "@shared/read-freshness";

const PROGRAM = "ORDER-STATE-PROPAGATION-REMEDIATION-1";

function enabled(): boolean {
  try {
    if (import.meta.env.VITE_ORDER_LIFECYCLE_LATENCY === "0") return false;
  } catch {
    /* non-vite */
  }
  return true;
}

export function noteReadFreshnessDecision(
  observation: ReadFreshnessObservation,
  surface: string
): void {
  if (!enabled()) return;
  if (observation.decision !== "keep_existing") return;
  console.info(
    `[mineuqr:rfg] stale_rejected`,
    JSON.stringify({
      program: PROGRAM,
      surface,
      orderId: observation.orderId,
      existingStatus: observation.existingStatus,
      incomingStatus: observation.incomingStatus,
      reason: observation.reason,
      counters: getReadFreshnessCounters(),
    })
  );
}
