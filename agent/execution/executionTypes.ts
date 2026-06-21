/**
 * THERMAL-PRINTING-6D Phase-2 — local execution types (runtime only, not persisted).
 *
 * THERMAL-PRINTING-10A: LocalJobPrepareContext replaces the former ExecutionContext name
 * to avoid collision with shared/printing/executionContext.ts (9C).
 */

export type LocalJobState = "received" | "validated" | "prepared" | "acknowledged" | "delivered";

export type LocalJobPrepareContext = {
  jobId: number;
  restaurantId: number;
  printerId: number;
  orderId: number;
  ticketItemCount: number;
  normalizedAt: string;
};

export type LocalJobRecord = {
  jobId: number;
  state: LocalJobState;
  prepareContext?: LocalJobPrepareContext;
  receivedAt: string;
  updatedAt: string;
};
