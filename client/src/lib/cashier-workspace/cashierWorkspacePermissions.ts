/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Existing POS permission keys used by V1 cashier operations.
 * Not a Staff Access catalog. Not plan seat limits.
 */

import type { PosPermission } from "@shared/pos";

/** Read + sale + check intake + settlement initiate. No shift/register/refund. */
export const CASHIER_V1_PERMISSIONS: readonly PosPermission[] = [
  "POS_ACCESS",
  "SALE_CREATE",
  "CHECK_INTAKE",
  "SETTLEMENT_INITIATE",
];
