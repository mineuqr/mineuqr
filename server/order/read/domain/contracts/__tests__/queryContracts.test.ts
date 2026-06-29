import { describe, expect, it } from "vitest";
import {
  ORDER_READ_QUERY_BINDINGS,
  clampActiveOrderLimit,
  buildReadResultMeta,
  DEFAULT_ACTIVE_ORDER_PAGE_LIMIT,
  MAX_ACTIVE_ORDER_PAGE_LIMIT,
} from "../queryContracts";

describe("order read query contracts", () => {
  it("defines Q-01 through Q-08 bindings", () => {
    const ids = ORDER_READ_QUERY_BINDINGS.map((b) => b.queryId);
    expect(ids).toContain("Q-01-list-active");
    expect(ids).toContain("Q-08-get-public-status");
    expect(ORDER_READ_QUERY_BINDINGS).toHaveLength(8);
  });

  it("clamps active order page limits per RA-03", () => {
    expect(clampActiveOrderLimit(undefined)).toBe(DEFAULT_ACTIVE_ORDER_PAGE_LIMIT);
    expect(clampActiveOrderLimit(0)).toBe(DEFAULT_ACTIVE_ORDER_PAGE_LIMIT);
    expect(clampActiveOrderLimit(999)).toBe(MAX_ACTIVE_ORDER_PAGE_LIMIT);
    expect(clampActiveOrderLimit(25)).toBe(25);
  });

  it("builds read result metadata with catalog version", () => {
    const meta = buildReadResultMeta(1, new Date("2026-06-27T10:00:00.000Z"));
    expect(meta.projectionSchemaVersion).toBe(1);
    expect(meta.queryCatalogVersion).toBe(1);
    expect(meta.generatedAt).toBe("2026-06-27T10:00:00.000Z");
  });
});
