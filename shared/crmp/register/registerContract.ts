/**
 * CRMP / ADR-ARCH-028 · ADR-ARCH-030 · REGISTER-CATALOG-MANAGEMENT-1
 * Register Aggregate Root — Catalog plane + Duty plane.
 * Register never owns Settlement money.
 */

import type {
  RegisterDutyStatus,
  RegisterStatus,
  RegisterType,
} from "../valueObjects";

export type RegisterId = string;

export type CashRegister = Readonly<{
  registerId: RegisterId;
  restaurantId: number;
  /** Restaurant-scoped unique operational code. */
  code: string;
  displayName: string;
  registerType: RegisterType;
  /** Catalog plane: provisioned | active | inactive */
  status: RegisterStatus;
  /** Duty plane: closed | open | suspended */
  dutyStatus: RegisterDutyStatus;
  /** Soft archive timestamp — not a catalog status. Null = not archived. */
  archivedAt: string | null;
  /** Optional Operational Device reference — never owned. */
  deviceId: string | null;
  /** Optional assigned operator while on duty — reference only. */
  assignedOperatorUserId: number | null;
  operatorAssignedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;
