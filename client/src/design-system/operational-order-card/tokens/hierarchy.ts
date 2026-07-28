/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — canonical reading order (documentation SSOT).
 */
export const OPERATIONAL_ORDER_HIERARCHY = [
  "header",
  "status",
  "items",
  "notes",
  "financial",
  "actions",
] as const;

export type OperationalOrderHierarchySlot =
  (typeof OPERATIONAL_ORDER_HIERARCHY)[number];
