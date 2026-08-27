import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_LIFECYCLE_POLL_MS,
  orderReadListQueryOptions,
} from "../queryRuntime";

describe("ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1 React Query", () => {
  it("keeps listActive poll at 3s regardless of SSE liveness", () => {
    expect(OPERATIONAL_LIFECYCLE_POLL_MS).toBe(3_000);
    const live = orderReadListQueryOptions(true);
    expect(live.refetchInterval).toBe(3_000);
    expect(live.staleTime).toBe(0);
    expect(orderReadListQueryOptions(false).refetchInterval).toBe(false);
  });
});
