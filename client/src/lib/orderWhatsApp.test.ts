import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderMessage } from "./orderWhatsApp";

describe("orderWhatsApp PR-CUX-1A", () => {
  it("includes real order number in message", () => {
    const message = buildWhatsAppOrderMessage({
      language: "en",
      restaurantName: "Test Cafe",
      orderNumber: "ORD-0007",
      tableNumber: 3,
      tableLabel: "tables",
      currencySymbol: "SAR",
      totalAmount: "20.00",
      items: [{ nameAr: "حمص", nameEn: "Hummus", price: "10.00", quantity: 2 }],
    });
    expect(message).toContain("ORD-0007");
    expect(message).not.toMatch(/ORD-\d{13}/);
  });
});
