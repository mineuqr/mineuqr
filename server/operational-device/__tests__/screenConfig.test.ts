import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN_CONFIG,
  mergeScreenConfig,
  parseScreenConfig,
} from "../domain/screenConfig";

describe("screenConfig", () => {
  it("returns defaults for invalid stored config", () => {
    expect(parseScreenConfig(null)).toEqual(DEFAULT_SCREEN_CONFIG);
    expect(parseScreenConfig("bad")).toEqual(DEFAULT_SCREEN_CONFIG);
  });

  it("merges partial screen settings", () => {
    const merged = mergeScreenConfig(DEFAULT_SCREEN_CONFIG, {
      language: "en",
      displayDirection: "ltr",
      visibleCategoryIds: [1, 2],
    });
    expect(merged.language).toBe("en");
    expect(merged.displayDirection).toBe("ltr");
    expect(merged.visibleCategoryIds).toEqual([1, 2]);
    expect(merged.displayDensity).toBe("large");
  });

  it("sanitizes visible category ids", () => {
    const parsed = parseScreenConfig({
      ...DEFAULT_SCREEN_CONFIG,
      visibleCategoryIds: [1, "x", 3.5],
    });
    expect(parsed.visibleCategoryIds).toEqual([1]);
  });
});
