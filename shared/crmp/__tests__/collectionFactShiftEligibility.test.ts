import { describe, expect, it } from "vitest";
import {
  classifyShiftsCoveringCommitTime,
  collectionFactCommitFallsInShiftWindow,
  compareAttributionInstants,
} from "../financialShift/collectionFactShiftEligibility";

describe("collectionFactShiftEligibility", () => {
  it("accepts a CF committed during an open Shift", () => {
    expect(
      collectionFactCommitFallsInShiftWindow({
        committedAt: "2026-08-29T19:12:23.000Z",
        openedAt: "2026-08-29T19:10:56.000Z",
        closedAt: null,
      })
    ).toBe(true);
  });

  it("rejects a CF committed before Shift openedAt", () => {
    expect(
      collectionFactCommitFallsInShiftWindow({
        committedAt: "2026-08-28T08:24:01.000Z",
        openedAt: "2026-08-29T19:10:56.000Z",
        closedAt: null,
      })
    ).toBe(false);
  });

  it("rejects a CF committed at or after closedAt (exclusive close)", () => {
    expect(
      collectionFactCommitFallsInShiftWindow({
        committedAt: "2026-08-29T19:10:56.000Z",
        openedAt: "2026-08-29T08:06:14.000Z",
        closedAt: "2026-08-29T19:10:56.000Z",
      })
    ).toBe(false);
  });

  it("accepts a CF committed at openedAt", () => {
    expect(
      collectionFactCommitFallsInShiftWindow({
        committedAt: "2026-08-29T19:10:56.000Z",
        openedAt: "2026-08-29T19:10:56.000Z",
        closedAt: null,
      })
    ).toBe(true);
  });

  it("keeps fixture timestamps t2/t3 comparable", () => {
    expect(compareAttributionInstants("t2", "t3")).toBeLessThan(0);
    expect(
      collectionFactCommitFallsInShiftWindow({
        committedAt: "t3",
        openedAt: "t2",
        closedAt: null,
      })
    ).toBe(true);
  });

  it("classifies none / unique / ambiguous without picking latest", () => {
    const a = {
      financialShiftId: "fsh_a",
      openedAt: "2026-08-29T08:00:00.000Z",
      closedAt: "2026-08-29T12:00:00.000Z",
    };
    const b = {
      financialShiftId: "fsh_b",
      openedAt: "2026-08-29T12:00:00.000Z",
      closedAt: null,
    };
    expect(
      classifyShiftsCoveringCommitTime([a, b], "2026-08-29T07:00:00.000Z").kind
    ).toBe("none");
    expect(
      classifyShiftsCoveringCommitTime([a, b], "2026-08-29T09:00:00.000Z")
    ).toEqual({ kind: "unique", shift: a });
    expect(
      classifyShiftsCoveringCommitTime([a, b], "2026-08-29T13:00:00.000Z")
    ).toEqual({ kind: "unique", shift: b });
    const overlap = {
      financialShiftId: "fsh_overlap",
      openedAt: "2026-08-29T10:00:00.000Z",
      closedAt: "2026-08-29T14:00:00.000Z",
    };
    const classified = classifyShiftsCoveringCommitTime(
      [a, overlap],
      "2026-08-29T11:00:00.000Z"
    );
    expect(classified.kind).toBe("ambiguous");
    if (classified.kind === "ambiguous") {
      expect(classified.shifts.map((s) => s.financialShiftId)).toEqual([
        "fsh_a",
        "fsh_overlap",
      ]);
    }
  });
});
