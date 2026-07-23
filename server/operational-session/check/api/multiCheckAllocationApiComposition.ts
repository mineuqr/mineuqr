/**
 * MULTI-CHECK-ALLOCATION-API-1 — composition root for API + Projection store.
 *
 * Shares one in-process Read Store instance so post-commit materializers
 * and API reads observe the same Projection.
 * Does not modify Projection builders / materializer modules.
 */

import { InMemoryMultiCheckAllocationProjectionStore } from "../read/multiCheckAllocationProjectionStore";
import type { MultiCheckAllocationProjectionStore } from "../read/multiCheckAllocationProjectionStore";
import { MultiCheckAllocationReadService } from "./multiCheckAllocationReadService";
import { MultiCheckAllocationWriteService } from "./multiCheckAllocationWriteService";

const store: MultiCheckAllocationProjectionStore =
  new InMemoryMultiCheckAllocationProjectionStore();

export function getMultiCheckAllocationProjectionStore(): MultiCheckAllocationProjectionStore {
  return store;
}

export const multiCheckAllocationReadService =
  new MultiCheckAllocationReadService(store);

export const multiCheckAllocationWriteService =
  new MultiCheckAllocationWriteService(store, multiCheckAllocationReadService);
