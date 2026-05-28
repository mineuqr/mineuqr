import { describe, expect, it } from "vitest";
import { createCooldownCounterMap } from "./cooldownCounterMap";

describe("createCooldownCounterMap", () => {
  it("increments within a window and resets after windowMs", () => {
    const map = createCooldownCounterMap({
      windowMs: 10_000,
      emitCooldownMs: 2_000,
      maxKeys: 10,
    });
    const t0 = 1_000_000;
    expect(map.increment("k", t0).count).toBe(1);
    expect(map.increment("k", t0 + 1).count).toBe(2);

    const e3 = map.increment("k", t0 + 10_001);
    expect(e3.count).toBe(1);
    expect(e3.windowStart).toBe(t0 + 10_001);
  });

  it("honors emit cooldown on the same entry", () => {
    const map = createCooldownCounterMap({
      windowMs: 60_000,
      emitCooldownMs: 5_000,
      maxKeys: 10,
    });
    const t0 = 2_000_000;
    const entry = map.increment("k", t0);
    expect(map.canEmit(entry, t0)).toBe(true);
    map.markEmitted(entry, t0);
    expect(map.canEmit(entry, t0 + 4_999)).toBe(false);
    expect(map.canEmit(entry, t0 + 5_000)).toBe(true);
  });
});
