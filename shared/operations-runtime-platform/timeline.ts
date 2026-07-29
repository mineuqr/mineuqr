/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Canonical execution timeline — observable only.
 */

export const RUNTIME_TIMELINE_EVENTS = [
  "job_created",
  "queued",
  "started",
  "running",
  "completed",
  "failed",
  "retried",
  "cancelled",
  "archived",
  "event_published",
  "event_consumed",
  "projection_updated",
] as const;

export type RuntimeTimelineEventId = (typeof RUNTIME_TIMELINE_EVENTS)[number];

export type RuntimeTimelineEventArchitecture = {
  id: RuntimeTimelineEventId;
  title: string;
  category: "job" | "event" | "projection";
  observableOnly: true;
};

export const RUNTIME_TIMELINE_ARCHITECTURE: readonly RuntimeTimelineEventArchitecture[] =
  [
    { id: "job_created", title: "Job Created", category: "job", observableOnly: true },
    { id: "queued", title: "Queued", category: "job", observableOnly: true },
    { id: "started", title: "Started", category: "job", observableOnly: true },
    { id: "running", title: "Running", category: "job", observableOnly: true },
    { id: "completed", title: "Completed", category: "job", observableOnly: true },
    { id: "failed", title: "Failed", category: "job", observableOnly: true },
    { id: "retried", title: "Retried", category: "job", observableOnly: true },
    { id: "cancelled", title: "Cancelled", category: "job", observableOnly: true },
    { id: "archived", title: "Archived", category: "job", observableOnly: true },
    { id: "event_published", title: "Event Published", category: "event", observableOnly: true },
    { id: "event_consumed", title: "Event Consumed", category: "event", observableOnly: true },
    { id: "projection_updated", title: "Projection Updated", category: "projection", observableOnly: true },
  ] as const;
