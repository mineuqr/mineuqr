/**
 * DATA-RETENTION-PLATFORM-1 — platform diagnostics only (no business events).
 */

import type {
  RetentionAuditEvent,
  RetentionMetricSnapshot,
} from "../types";

export type RetentionDiagnostics = {
  log(event: RetentionAuditEvent): void;
  listEvents(): readonly RetentionAuditEvent[];
  metrics(): RetentionMetricSnapshot;
  reset(): void;
};

export function createRetentionDiagnostics(): RetentionDiagnostics {
  const events: RetentionAuditEvent[] = [];
  let transitionsAttempted = 0;
  let transitionsApplied = 0;
  let dryRuns = 0;
  let simulations = 0;
  let policiesRegistered = 0;
  let holdsActive = 0;

  return {
    log(event) {
      events.push(Object.freeze({ ...event, detail: { ...event.detail } }));
      if (event.eventType === "lifecycle_transition") {
        transitionsAttempted += 1;
        if (event.detail.applied === true) transitionsApplied += 1;
      }
      if (event.eventType === "dry_run") dryRuns += 1;
      if (event.eventType === "simulation") simulations += 1;
      if (event.eventType === "hold_placed") holdsActive += 1;
      if (event.eventType === "hold_released") {
        holdsActive = Math.max(0, holdsActive - 1);
      }
      if (
        event.eventType === "policy_resolved" &&
        event.detail.registered === true
      ) {
        policiesRegistered += 1;
      }
    },
    listEvents: () => [...events],
    metrics: () => ({
      policiesRegistered,
      holdsActive,
      transitionsAttempted,
      transitionsApplied,
      dryRuns,
      simulations,
    }),
    reset() {
      events.length = 0;
      transitionsAttempted = 0;
      transitionsApplied = 0;
      dryRuns = 0;
      simulations = 0;
      policiesRegistered = 0;
      holdsActive = 0;
    },
  };
}

export function structuredRetentionLog(
  diagnostics: RetentionDiagnostics,
  event: RetentionAuditEvent
): RetentionAuditEvent {
  diagnostics.log(event);
  return event;
}
