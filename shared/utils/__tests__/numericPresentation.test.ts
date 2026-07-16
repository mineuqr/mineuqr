import { describe, expect, it } from "vitest";
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  toWesternDigits,
  withWesternDigitsIntlOptions,
} from "../numericPresentation";

describe("GLOBAL-NUMERIC-PRESENTATION-POLICY-1", () => {
  it("converts Eastern and Persian digits plus Arabic separators", () => {
    expect(toWesternDigits("١٥٤٥٠")).toBe("15450");
    expect(toWesternDigits("۱۵٫۵")).toBe("15.5");
    expect(toWesternDigits("١٥٬٤٥٠٫٧٥")).toBe("15,450.75");
  });

  it("forces numberingSystem latn on Intl options", () => {
    expect(withWesternDigitsIntlOptions({ dateStyle: "short" })).toEqual({
      dateStyle: "short",
      numberingSystem: "latn",
    });
  });

  it("formats Arabic locale numbers with Western digits", () => {
    const formatted = formatLocaleNumber(15450.75, "ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(formatted).toMatch(/[0-9]/);
    expect(formatted).not.toMatch(/[٠-٩۰-۹]/);
  });

  it("formats Arabic locale dates with Western digits", () => {
    const formatted = formatLocaleDateTime(
      new Date("2026-07-16T15:41:00.000Z"),
      "ar-SA",
      { dateStyle: "short", timeStyle: "short" }
    );
    expect(formatted).toMatch(/[0-9]/);
    expect(formatted).not.toMatch(/[٠-٩۰-۹]/);
  });
});
