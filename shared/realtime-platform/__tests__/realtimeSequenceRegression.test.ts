/**
 * REALTIME-ARCHITECTURE-REGRESSION-GUARD-1
 * Behavioral guards for sequence / dedup / gap (G39–G41, G62–G64).
 */
import { describe, expect, it } from "vitest";
import { RealtimeSequenceTracker } from "../sequence";

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 sequence tracker", () => {
  it("applies first and next seq", () => {
    const t = new RealtimeSequenceTracker();
    expect(t.observe(1, "kitchen", 1, "9").action).toBe("apply");
    expect(t.observe(1, "kitchen", 2, "9").action).toBe("apply");
  });

  it("G39/G62: duplicate / equal seq does not advance as gap", () => {
    const t = new RealtimeSequenceTracker();
    t.observe(1, "kitchen", 5, "9");
    const dup = t.observe(1, "kitchen", 5, "9");
    expect(dup.action).toBe("apply");
    expect(dup).toMatchObject({ reason: "equal_refresh" });
  });

  it("G40/G63: stale seq is dropped as duplicate", () => {
    const t = new RealtimeSequenceTracker();
    t.observe(1, "kitchen", 10, "9");
    const stale = t.observe(1, "kitchen", 9, "9");
    expect(stale.action).toBe("duplicate");
    expect(stale).toMatchObject({ reason: "stale_or_dup" });
  });

  it("G41/G64: gap is detected when seq jumps", () => {
    const t = new RealtimeSequenceTracker();
    t.observe(1, "kitchen", 3, "9");
    const gap = t.observe(1, "kitchen", 6, "9");
    expect(gap.action).toBe("gap");
    expect(gap).toMatchObject({
      reason: "sequence_gap",
      expected: 4,
      got: 6,
    });
  });

  it("isolates aggregates and restaurants", () => {
    const t = new RealtimeSequenceTracker();
    t.observe(1, "kitchen", 1, "A");
    expect(t.observe(1, "kitchen", 1, "B").action).toBe("apply");
    expect(t.observe(2, "kitchen", 1, "A").action).toBe("apply");
  });
});
