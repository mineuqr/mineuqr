/**
 * Official projection identifiers (READ-ARCHITECTURE-1 RA-02).
 * Phase 1: catalog only — no materialized stores.
 */
export const ORDER_READ_PROJECTION_SCHEMA_VERSION = 1 as const;

export type ProjectionId =
  | "P-01-owner-orders"
  | "P-02-active-orders"
  | "P-03-order-details"
  | "P-04-order-timeline"
  | "P-05-dashboard"
  | "P-06-operational-kpi"
  | "P-07-kitchen-queue"
  | "P-08-printing-queue"
  | "P-09-settlement"
  | "P-10-analytics"
  | "P-11-public-order-status"
  | "P-12-session-workspace";

export const ORDER_PROJECTION_IDS = [
  "P-01-owner-orders",
  "P-02-active-orders",
  "P-03-order-details",
  "P-04-order-timeline",
  "P-05-dashboard",
  "P-06-operational-kpi",
  "P-07-kitchen-queue",
  "P-08-printing-queue",
  "P-09-settlement",
  "P-10-analytics",
  "P-11-public-order-status",
  "P-12-session-workspace",
] as const satisfies readonly ProjectionId[];
