import { describe, expect, it } from "vitest";
import {
  formatDisplayOrderNumber,
  formatDisplayReference,
} from "../DisplayReferenceFormatter";

describe("DisplayReferenceFormatter", () => {
  it("formats padded daily display numbers", () => {
    expect(formatDisplayOrderNumber(1)).toBe("001");
    expect(formatDisplayOrderNumber(12)).toBe("012");
  });

  it("supports sequence-only and dated display references with channel scope", () => {
    expect(formatDisplayReference("2026-07-10", 3, "sequence")).toBe("T #003");
    expect(formatDisplayReference("2026-07-10", 3, "sequence", "KIOSK")).toBe("K #003");
    expect(formatDisplayReference("2026-07-10", 3, "day-sequence")).toBe("T #10-07-003");
    expect(formatDisplayReference("2026-07-10", 3, "iso-day-sequence")).toBe(
      "T #2026-07-10-003"
    );
  });
});
