/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Worker Platform — reserved architecture only.
 */

export const WORKER_KINDS = [
  "dedicated",
  "shared",
  "background_processing",
  "retry_workers",
  "maintenance_workers",
] as const;

export type WorkerKindId = (typeof WORKER_KINDS)[number];

export type WorkerKindArchitecture = {
  id: WorkerKindId;
  title: string;
  maturity: "reserved";
  notes: string;
};

export const WORKER_PLATFORM_ARCHITECTURE: readonly WorkerKindArchitecture[] = [
  { id: "dedicated", title: "Dedicated Workers", maturity: "reserved", notes: "Future implementation only." },
  { id: "shared", title: "Shared Workers", maturity: "reserved", notes: "Future implementation only." },
  { id: "background_processing", title: "Background Processing", maturity: "reserved", notes: "Future implementation only." },
  { id: "retry_workers", title: "Retry Workers", maturity: "reserved", notes: "Future implementation only." },
  { id: "maintenance_workers", title: "Maintenance Workers", maturity: "reserved", notes: "Future implementation only." },
] as const;
