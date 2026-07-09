import { describe, expect, it } from "vitest";
import {
  formatOperationalElapsedCompact,
  formatOperationalFulfillmentLabel,
  formatOperationalItemOverflow,
  formatOperationalQuantity,
  operationalCardElapsedClass,
  operationalFooterStatusLabel,
} from "../operationalCardTypography";

describe("operationalCardTypography", () => {
  it("uses English numerals for elapsed time in Arabic mode", () => {
    expect(formatOperationalElapsedCompact(12, true)).toBe("12 دقيقة");
    expect(formatOperationalElapsedCompact(90, true)).toBe("1 ساعة 30 دقيقة");
    expect(formatOperationalElapsedCompact(12, false)).toBe("12 min");
  });

  it("uses English numerals for table labels in Arabic mode", () => {
    expect(formatOperationalFulfillmentLabel(4, true)).toBe("طاولة 4");
    expect(formatOperationalFulfillmentLabel(4, false)).toBe("Table 4");
  });

  it("uses English numerals for quantities and overflow", () => {
    expect(formatOperationalQuantity(2)).toBe("2");
    expect(formatOperationalItemOverflow(3, true)).toBe("+3 أخرى");
  });

  it("balances elapsed urgency typography for compact cards", () => {
    const base = "text-sm font-extrabold whitespace-nowrap";
    expect(operationalCardElapsedClass({ status: "on-time" } as never, base)).toBe(base);
    const critical = operationalCardElapsedClass({ status: "critical" } as never, base);
    expect(critical).toMatch(/\btext-sm\b/);
    expect(critical).not.toMatch(/\btext-lg\b/);
    expect(critical).not.toMatch(/\btext-xl\b/);
  });

  it("formats footer status labels in sentence case", () => {
    expect(operationalFooterStatusLabel("preparing", false)).toMatch(/prepar/i);
  });
});
