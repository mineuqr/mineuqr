/**
 * THERMAL-PRINTING-6D Phase-2 — local execution types (runtime only, not persisted).
 */

export type LocalJobState = "received" | "validated" | "prepared" | "acknowledged";

export type ExecutionContext = {
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
  context?: ExecutionContext;
  receivedAt: string;
  updatedAt: string;
};
