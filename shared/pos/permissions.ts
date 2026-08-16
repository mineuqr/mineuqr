/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * Permission namespace only. Not a RBAC platform. Not granted by owner role.
 */

export const POS_PERMISSIONS = [
  "POS_ACCESS",
  "SALE_CREATE",
  "CHECK_INTAKE",
  "SETTLEMENT_INITIATE",
  "SALE_VOID",
  "CHECK_DISCOUNT",
  "REFUND_CREATE",
  "REFUND_APPROVE",
  "SHIFT_OPEN",
  "SHIFT_CLOSE",
  "REGISTER_ADJUST",
  "TERMINAL_MANAGE",
] as const;

export type PosPermission = (typeof POS_PERMISSIONS)[number];

export function isPosPermission(value: string): value is PosPermission {
  return (POS_PERMISSIONS as readonly string[]).includes(value);
}
