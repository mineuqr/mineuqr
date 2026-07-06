import { describe, expect, it } from "vitest";
import {
  resolveScreenConfigVersion,
  screenConfigVersionsDiffer,
} from "../domain/screenConfigVersion";

describe("resolveScreenConfigVersion", () => {
  it("prefers screenConfigRevision when present", () => {
    expect(
      resolveScreenConfigVersion({
        screenConfigRevision: 3,
        updatedAt: "2026-07-06T10:00:00.000Z",
      })
    ).toBe("3");
  });

  it("falls back to updatedAt for legacy rows without revision", () => {
    expect(
      resolveScreenConfigVersion({
        screenConfigRevision: 0,
        updatedAt: "2026-07-06T10:00:00.000Z",
      })
    ).toBe("2026-07-06T10:00:00.000Z");
  });

  it("detects version differences for reload decisions", () => {
    expect(screenConfigVersionsDiffer("1", "1")).toBe(false);
    expect(screenConfigVersionsDiffer("1", "2")).toBe(true);
    expect(screenConfigVersionsDiffer(null, "1")).toBe(false);
  });
});
