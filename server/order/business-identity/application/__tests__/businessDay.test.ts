import { describe, expect, it } from "vitest";
import {
  resolveBusinessDayKey,
  resolveBusinessDayWindow,
  resolveNormalizedOpeningHours,
} from "../../../../../shared/utils/businessDay";

const hours06 = resolveNormalizedOpeningHours({
  monday: { open: "06:00", close: "23:00", closed: false },
  tuesday: { open: "06:00", close: "23:00", closed: false },
  wednesday: { open: "06:00", close: "23:00", closed: false },
  thursday: { open: "06:00", close: "23:00", closed: false },
  friday: { open: "06:00", close: "23:00", closed: false },
  saturday: { open: "06:00", close: "23:00", closed: false },
  sunday: { open: "06:00", close: "23:00", closed: false },
});

describe("businessDay", () => {
  it("assigns orders before opening to previous business day", () => {
    const key = resolveBusinessDayKey("2026-07-10T02:00:00Z", hours06, "Asia/Riyadh");
    expect(key).toBe("2026-07-09");
  });

  it("assigns orders after opening to current business day", () => {
    const key = resolveBusinessDayKey("2026-07-10T08:00:00Z", hours06, "Asia/Riyadh");
    expect(key).toBe("2026-07-10");
  });

  it("builds a business-day window from opening to next opening", () => {
    const window = resolveBusinessDayWindow("2026-07-10", hours06, "Asia/Riyadh");
    expect(window.businessDay).toBe("2026-07-10");
    expect(window.startIso < window.endIso).toBe(true);
  });

  it("isolates business days per restaurant opening configuration", () => {
    const lateOpen = resolveNormalizedOpeningHours({
      monday: { open: "10:00", close: "23:00", closed: false },
      tuesday: { open: "10:00", close: "23:00", closed: false },
      wednesday: { open: "10:00", close: "23:00", closed: false },
      thursday: { open: "10:00", close: "23:00", closed: false },
      friday: { open: "10:00", close: "23:00", closed: false },
      saturday: { open: "10:00", close: "23:00", closed: false },
      sunday: { open: "10:00", close: "23:00", closed: false },
    });

    const early = resolveBusinessDayKey("2026-07-10T04:00:00Z", hours06, "Asia/Riyadh");
    const late = resolveBusinessDayKey("2026-07-10T04:00:00Z", lateOpen, "Asia/Riyadh");
    expect(early).toBe("2026-07-10");
    expect(late).toBe("2026-07-09");
  });
});
