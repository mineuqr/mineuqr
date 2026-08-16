/**
 * POS-PERSISTENCE-WIRING-1
 * Explicit store selection. Production/development → Drizzle.
 * NODE_ENV=test → InMemory. Not a generic repository factory.
 */

import { DrizzlePosPermissionGrantStore } from "./DrizzlePosPermissionGrantStore";
import { DrizzlePosSaleIdempotencyStore } from "./DrizzlePosSaleIdempotencyStore";
import { DrizzlePosTerminalStore } from "./DrizzlePosTerminalStore";
import { InMemoryPosPermissionGrantStore } from "./InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "./InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "./InMemoryPosTerminalStore";
import type { PosPermissionGrantStore } from "./PosPermissionGrantStore";
import type { PosSaleIdempotencyStore } from "./PosSaleIdempotencyStore";
import type { PosTerminalStore } from "./PosTerminalStore";

export function selectPosTerminalStore(
  nodeEnv = process.env.NODE_ENV
): PosTerminalStore {
  return nodeEnv === "test"
    ? new InMemoryPosTerminalStore()
    : new DrizzlePosTerminalStore();
}

export function selectPosPermissionGrantStore(
  nodeEnv = process.env.NODE_ENV
): PosPermissionGrantStore {
  return nodeEnv === "test"
    ? new InMemoryPosPermissionGrantStore()
    : new DrizzlePosPermissionGrantStore();
}

export function selectPosSaleIdempotencyStore(
  nodeEnv = process.env.NODE_ENV
): PosSaleIdempotencyStore {
  return nodeEnv === "test"
    ? new InMemoryPosSaleIdempotencyStore()
    : new DrizzlePosSaleIdempotencyStore();
}
