import { describe, expect, it, vi } from "vitest";
import { buildKitchenRuntimeStream } from "../buildKitchenRuntimeStream";
import type { KitchenQueueResult } from "@/lib/kitchen/types";

const sampleQueue: KitchenQueueResult = {
  generatedAt: "2026-07-06T10:00:00.000Z",
  orderingPolicyId: "fifo-by-created-at",
  queryCatalogVersion: 1,
  projectionSchemaVersion: 2,
  categoryProjectionVersion: 1,
  projectionBuildDurationMs: 1,
  projectionIntegrity: "valid",
  tickets: [],
  columns: { pending: [], preparing: [], ready: [] },
  meta: { totalVisible: 0, counts: { pending: 0, preparing: 0, ready: 0 } },
};

const predicate = () => true;

describe("buildKitchenRuntimeStream", () => {
  it("returns error state without queue when fetch fails with no cached data", () => {
    const stream = buildKitchenRuntimeStream({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("database_unavailable"),
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });

    expect(stream.isError).toBe(true);
    expect(stream.queue).toBeNull();
    expect(stream.isShowingStaleData).toBe(false);
    expect(stream.failureKind).toBe("database_unavailable");
    expect(stream.operatorMessage).toContain("temporarily unavailable");
  });

  it("never treats fetch failure without data as an empty kitchen", () => {
    const stream = buildKitchenRuntimeStream({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("fetch_failed"),
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });

    expect(stream.queue).toBeNull();
    expect(stream.isError).toBe(true);
  });

  it("marks placeholder cached data as stale when fetch fails", () => {
    const stream = buildKitchenRuntimeStream({
      data: sampleQueue,
      isLoading: false,
      isError: true,
      error: new Error("network"),
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });

    expect(stream.isShowingStaleData).toBe(true);
    expect(stream.queue).not.toBeNull();
    expect(stream.isError).toBe(true);
  });

  it("returns empty queue only on successful fetch", () => {
    const stream = buildKitchenRuntimeStream({
      data: sampleQueue,
      isLoading: false,
      isError: false,
      error: null,
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });

    expect(stream.isError).toBe(false);
    expect(stream.queue).not.toBeNull();
    expect(stream.queue?.tickets).toHaveLength(0);
  });

  it("recovered fetch clears error flags", () => {
    const failed = buildKitchenRuntimeStream({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("database_unavailable"),
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });
    expect(failed.isError).toBe(true);

    const recovered = buildKitchenRuntimeStream({
      data: sampleQueue,
      isLoading: false,
      isError: false,
      error: null,
      language: "en",
      categoryFilterEnabled: false,
      categoryFilterPredicate: predicate,
    });
    expect(recovered.isError).toBe(false);
    expect(recovered.isShowingStaleData).toBe(false);
    expect(recovered.failureKind).toBeNull();
  });
});
