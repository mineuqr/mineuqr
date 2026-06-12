import { describe, expect, it } from "vitest";
import {
  formatCustomerOrderDate,
  formatCustomerOrderTime,
} from "./customerOrderDateTime";

/** Fixed UTC instant: 2026-06-12 10:09:00Z → 13:09 Asia/Riyadh */
const SAMPLE_UTC = "2026-06-12T10:09:00.000Z";

describe("customerOrderDateTime CUX-1A-POLISH-1", () => {
  it("formats date and time separately for Arabic", () => {
    const date = formatCustomerOrderDate(SAMPLE_UTC, "ar");
    const time = formatCustomerOrderTime(SAMPLE_UTC, "ar");
    expect(date).toBeTruthy();
    expect(time).toBeTruthy();
    expect(date).not.toEqual(time);
    expect(date).toMatch(/2026/);
    expect(time).toMatch(/01:09|1:09|٠١:٠٩/);
  });

  it("formats date and time separately for English", () => {
    const date = formatCustomerOrderDate(SAMPLE_UTC, "en");
    const time = formatCustomerOrderTime(SAMPLE_UTC, "en");
    expect(date).toContain("2026");
    expect(time).toMatch(/1:09|01:09/);
  });

  it("returns empty strings for invalid input", () => {
    expect(formatCustomerOrderDate("", "ar")).toBe("");
    expect(formatCustomerOrderTime(null, "en")).toBe("");
  });
});
