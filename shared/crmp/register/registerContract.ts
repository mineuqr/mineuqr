/**
 * CRMP-IMPLEMENTATION-1 — Register Aggregate Root contract.
 */

import type { RegisterStatus } from "../valueObjects";

export type RegisterId = string;

export type CashRegister = Readonly<{
  registerId: RegisterId;
  restaurantId: number;
  displayName: string;
  status: RegisterStatus;
  /** Optional Operational Device reference — never owned. */
  deviceId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;
