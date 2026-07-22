/**
 * ORDER-SETTLEMENT-API-1 — composition root for Read API + Projection store.
 *
 * Shares one in-process Read Store instance so post-commit materializers
 * (Presentation adoption) and API reads observe the same Projection.
 * Does not modify Projection builders / materializer modules.
 */

import { InMemoryOrderSettlementProjectionStore } from "../read/orderSettlementProjectionStore";
import type { OrderSettlementProjectionStore } from "../read/orderSettlementProjectionStore";
import { OrderSettlementReadService } from "./orderSettlementReadService";

const store: OrderSettlementProjectionStore =
  new InMemoryOrderSettlementProjectionStore();

export function getOrderSettlementProjectionStore(): OrderSettlementProjectionStore {
  return store;
}

export const orderSettlementReadService = new OrderSettlementReadService(store);
