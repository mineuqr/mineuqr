/**
 * THERMAL-PRINTING-8A.1 — agent routing decision model (AGENT-ROUTING-NOTE-1).
 */

export const ROUTING_REASONS = {
  PRINTER_OWNER: "printer-owner",
  MANUAL_ASSIGNMENT: "manual-assignment",
} as const;

export type RoutingReason = (typeof ROUTING_REASONS)[keyof typeof ROUTING_REASONS];

export type RoutingDecision = {
  jobId: number;
  agentId: string;
  printerId: number;
  reason: RoutingReason;
};

export const ROUTING_FAILURE_CODES = {
  UNKNOWN_PRINTER: "unknown-printer",
  OFFLINE_OWNER: "offline-owner",
  MULTIPLE_CANDIDATES: "multiple-candidates",
  NO_CANDIDATES: "no-candidates",
  RESOLUTION_CONFLICT: "resolution-conflict",
  UNRESOLVED_PRINTER: "unresolved-printer",
  RESTAURANT_MISMATCH: "restaurant-mismatch",
} as const;

export type RoutingFailureCode =
  (typeof ROUTING_FAILURE_CODES)[keyof typeof ROUTING_FAILURE_CODES];

export class RoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingError";
  }
}

export class RoutingRejectedError extends RoutingError {
  constructor(
    public readonly code: RoutingFailureCode,
    message: string
  ) {
    super(message);
    this.name = "RoutingRejectedError";
  }
}

export type ResolveRoutingDecisionInput = {
  jobId: number;
  printerId: number;
  restaurantId: number;
  evaluationNow?: Date;
};
