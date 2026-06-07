import { describe, expect, it } from "vitest";
import {
  CLIENT_GATE_REGISTRY,
  getClientGateConsolidationStats,
} from "./clientGateRegistry";

describe("clientGateRegistry", () => {
  it("has no NEEDS_MIGRATION or REDUNDANT gates after PG-1C.3C", () => {
    const legacy = CLIENT_GATE_REGISTRY.filter(
      (e) => e.status === "NEEDS_MIGRATION" || e.status === "REDUNDANT"
    );
    expect(legacy).toHaveLength(0);
  });

  it("reports consolidation progress", () => {
    const stats = getClientGateConsolidationStats();
    expect(stats.total).toBe(CLIENT_GATE_REGISTRY.length);
    expect(stats.migrated).toBeGreaterThan(0);
    expect(stats.progressPct).toBeGreaterThanOrEqual(0);
    expect(stats.progressPct).toBeLessThanOrEqual(100);
  });

  it("every migrated gate has an authority path", () => {
    const migrated = CLIENT_GATE_REGISTRY.filter((e) => e.status === "MIGRATED");
    for (const gate of migrated) {
      expect(gate.authorityPath.length).toBeGreaterThan(0);
    }
  });
});
