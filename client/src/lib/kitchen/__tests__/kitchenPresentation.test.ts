import { describe, expect, it } from "vitest";
import {
  deriveKitchenOrderType,
  formatKitchenElapsed,
  formatKitchenElapsedCompact,
  formatKitchenFulfillmentLabel,
  formatKitchenItemOverflow,
  formatKitchenOrderType,
  formatQuantityLine,
  kitchenCardElapsedClass,
  kitchenStatusPresentation,
  productDisplayName,
  toArabicDigits,
} from "../kitchenPresentation";
import type { KitchenTicketLine } from "../viewModels";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "@/lib/kitchen/lineProjection";
import { mockCategoryProjection } from "@/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures";

const line: KitchenTicketLine = {
  projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  lineItemId: 1,
  menuItemId: 5,
  nameAr: "تبولة",
  nameEn: "Tabbouleh",
  quantity: 2,
  price: "10.00",
  itemNotes: null,
  category: mockCategoryProjection(),
};

describe("kitchenPresentation", () => {
  it("converts western digits to Arabic-Indic digits", () => {
    expect(toArabicDigits(123)).toBe("١٢٣");
    expect(toArabicDigits(0)).toBe("٠");
  });

  it("prefers Arabic product name in Arabic mode even when English exists", () => {
    expect(productDisplayName(line, true)).toBe("تبولة");
  });

  it("falls back to Arabic when English is missing in English mode", () => {
    expect(productDisplayName({ ...line, nameEn: null }, false)).toBe("تبولة");
  });

  it("formats Arabic-friendly quantity line", () => {
    expect(formatQuantityLine(line, true)).toBe("٢ × تبولة");
  });

  it("formats glanceable elapsed time", () => {
    expect(formatKitchenElapsed(5, false)).toBe("5 min ago");
    expect(formatKitchenElapsed(5, true)).toBe("منذ ٥ دقيقة");
    expect(formatKitchenElapsed(90, false)).toBe("1h 30m ago");
    expect(formatKitchenElapsed(60, true)).toBe("منذ ١ ساعة");
  });

  it("derives order type from table number for presentation", () => {
    expect(deriveKitchenOrderType(4)).toBe("table");
    expect(deriveKitchenOrderType(0)).toBe("takeaway");
    expect(formatKitchenOrderType("table", false)).toBe("Table");
    expect(formatKitchenOrderType("takeaway", true)).toBe("سفري");
    expect(formatKitchenFulfillmentLabel(4, false)).toBe("Table 4");
    expect(formatKitchenFulfillmentLabel(0, true)).toBe("سفري");
  });

  it("formats compact elapsed time for kitchen headers", () => {
    expect(formatKitchenElapsedCompact(12, false)).toBe("12 min");
    expect(formatKitchenElapsedCompact(12, true)).toBe("١٢ دقيقة");
    expect(formatKitchenElapsedCompact(90, false)).toBe("1h 30m");
    expect(formatKitchenElapsedCompact(60, true)).toBe("١ ساعة");
    expect(formatKitchenElapsedCompact(90, true)).toBe("١ ساعة ٣٠ دقيقة");
  });

  it("formats localized item overflow label", () => {
    expect(formatKitchenItemOverflow(4, false)).toBe("+4 more");
    expect(formatKitchenItemOverflow(4, true)).toBe("+٤ أخرى");
  });

  it("maps kitchen status to dot, accent, and action tones", () => {
    expect(kitchenStatusPresentation("pending").dotClass).toContain("sky");
    expect(kitchenStatusPresentation("preparing").dotClass).toContain("orange");
    expect(kitchenStatusPresentation("ready").dotClass).toContain("emerald");
    expect(kitchenStatusPresentation("pending").accentClass).toBe("bg-sky-500");
    expect(kitchenStatusPresentation("preparing").actionButtonClass).toContain("orange");
    expect(kitchenStatusPresentation("ready").actionButtonClass).toContain("text-white");
  });

  it("emphasizes elapsed time typography by urgency tier", () => {
    const base = "text-lg font-black";
    expect(kitchenCardElapsedClass({ status: "on-time", urgencyTier: "normal" } as never, base)).toBe(
      base
    );
    expect(kitchenCardElapsedClass({ status: "at-risk", urgencyTier: "elevated" } as never, base)).toContain(
      "ring-amber"
    );
    expect(kitchenCardElapsedClass({ status: "critical", urgencyTier: "critical" } as never, base)).toContain(
      "underline"
    );
  });
});
