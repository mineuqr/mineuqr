/**
 * SPLIT-PAYMENT-API-1 — composition root for Read API + Projection store.
 *
 * Shares one in-process Read Store instance so post-commit materializers
 * and API reads observe the same Projection.
 * Does not modify Projection builders / materializer modules.
 */

import { InMemorySplitPaymentProjectionStore } from "../read/splitPaymentProjectionStore";
import type { SplitPaymentProjectionStore } from "../read/splitPaymentProjectionStore";
import { SplitPaymentReadService } from "./splitPaymentReadService";

const store: SplitPaymentProjectionStore =
  new InMemorySplitPaymentProjectionStore();

export function getSplitPaymentProjectionStore(): SplitPaymentProjectionStore {
  return store;
}

export const splitPaymentReadService = new SplitPaymentReadService(store);
