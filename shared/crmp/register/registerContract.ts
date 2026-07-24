/**
 * CRMP / ADR-ARCH-028 · ADR-ARCH-030 — Register Aggregate Root contract.
 * Catalog plane + Duty plane + operator / device references.
 * Register never owns Settlement money.
 */

import type { RegisterDutyStatus, RegisterStatus } from "../valueObjects";

export type RegisterId = string;

export type CashRegister = Readonly<{
  registerId: RegisterId;
  restaurantId: number;
  displayName: string;
  /** Catalog plane: provisioned | active | inactive */
  status: RegisterStatus;
  /** Duty plane: closed | open | suspended */
  dutyStatus: RegisterDutyStatus;
  /** Optional Operational Device reference — never owned. */
  deviceId: string | null;
  /** Optional assigned operator while on duty — reference only. */
  assignedOperatorUserId: number | null;
  operatorAssignedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;
