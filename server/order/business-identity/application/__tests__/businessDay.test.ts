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
    // Thu 2026-07-10 06:00 Asia/Riyadh → 03:00Z; Fri open 06:00 → 03:00Z next day
    expect(window.startIso).toBe("2026-07-10T03:00:00.000Z");
    expect(window.endIso).toBe("2026-07-11T03:00:00.000Z");
  });

  it("keeps late next-day open windows host-timezone independent (prod Friday 23:45)", () => {
    // Mirrors restaurant 720007: Friday opens 23:45 → long Thu business day.
    const prodLike = resolveNormalizedOpeningHours({
      sunday: { open: "09:00", close: "08:59", closed: false },
      monday: { open: "09:00", close: "08:00", closed: false },
      tuesday: { open: "09:00", close: "08:00", closed: false },
      wednesday: { open: "09:00", close: "08:59", closed: false },
      thursday: { open: "09:00", close: "08:00", closed: false },
      friday: { open: "23:45", close: "08:00", closed: false },
      saturday: { open: "09:00", close: "08:59", closed: false },
    });

    const key = resolveBusinessDayKey("2026-06-12T16:07:09.000Z", prodLike, "Asia/Riyadh");
    expect(key).toBe("2026-06-11");

    const window = resolveBusinessDayWindow("2026-06-11", prodLike, "Asia/Riyadh");
    expect(window.startIso).toBe("2026-06-11T06:00:00.000Z");
    expect(window.endIso).toBe("2026-06-12T20:45:00.000Z");

    // Collision cohort must remain inside the window for historic rank.
    expect("2026-06-12T16:07:09.000Z" < window.endIso).toBe(true);
    expect("2026-06-12T16:09:47.000Z" < window.endIso).toBe(true);
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
