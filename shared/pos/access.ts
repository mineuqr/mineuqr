/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1
 * Server-authoritative access context. Owner ≠ cashier.
 */

import type { PosPermission } from "./permissions";

export type PosRestaurantScopeKind = "owner" | "admin" | "pos_grant";

export type PosAccessReasonCode =
  | "granted"
  | "unauthenticated"
  | "restaurant_access_denied"
  | "terminal_not_found"
  | "terminal_foreign"
  | "terminal_inactive"
  | "entitlement_unavailable"
  | "pos_permission_denied";

export type PosAccessContext = {
  userId: number;
  restaurantId: number;
  terminalId: string;
  permissions: readonly PosPermission[];
  restaurantScope: PosRestaurantScopeKind;
};

/** @deprecated Phase 1 request shape — permission is required, not granted. */
export type PosAccessRequest = {
  restaurantId: number;
  terminalId: string | null;
  userId: number;
  permission: PosPermission;
};

export type PosAccessDecision = {
  allowed: boolean;
  reasonCode: PosAccessReasonCode | string;
  context?: PosAccessContext;
};
