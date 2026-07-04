import { describe, expect, it } from "vitest";
import {
  formatKitchenElapsed,
  formatQuantityLine,
  productDisplayName,
  toArabicDigits,
} from "../kitchenPresentation";
import type { KitchenTicketLine } from "../viewModels";

const line: KitchenTicketLine = {
  lineItemId: 1,
  menuItemId: 5,
  nameAr: "تبولة",
  nameEn: "Tabbouleh",
  quantity: 2,
  price: "10.00",
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
});
