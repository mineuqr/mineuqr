import { describe, expect, it } from "vitest";
import { serializePrintPayloadToText } from "../PrintPayloadTextSerializer";
import type { PrintPayload } from "../../printing/domain/PrintPayload";

function payload(overrides: Partial<PrintPayload> = {}): PrintPayload {
  return {
    schemaVersion: 1,
    restaurantId: 1,
    orderId: 10,
    orderNumber: "ORD-0010",
    displayOrderNumber: "010",
    displayReference: "#010",
    businessDay: "2026-07-14",
    orderStatus: "preparing",
    tableNumber: 4,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "4",
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "30.00",
    createdAt: "2026-07-14T10:00:00.000Z",
    lineItems: [
      {
        lineItemId: 1,
        menuItemId: 5,
        nameAr: "شاورما",
        nameEn: "Shawarma",
        quantity: 1,
        price: "15.00",
        itemNotes: null,
      },
      {
        lineItemId: 2,
        menuItemId: 6,
        nameAr: "حمص",
        nameEn: "Hummus",
        quantity: 2,
        price: "7.50",
        itemNotes: "No oil",
      },
    ],
    requestedAt: "2026-07-14T10:05:00.000Z",
    trigger: { source: "operator" },
    ...overrides,
  };
}

describe("ORDERING-OPERATIONAL-NOTES-PRESENTATION-1 print text", () => {
  it("renders item notes under owning lines and order notes once", () => {
    const text = serializePrintPayloadToText(
      payload({ notes: "All together please" })
    );
    expect(text).toContain("1x Shawarma @ 15.00\n  2x Hummus @ 7.50");
    expect(text).toContain("2x Hummus @ 7.50\n    Note: No oil");
    expect(text).toContain("Notes: All together please");
    expect(text.indexOf("Note: No oil")).toBeLessThan(text.indexOf("Notes: All together"));
  });

  it("omits note sections when absent", () => {
    const text = serializePrintPayloadToText(
      payload({
        notes: null,
        lineItems: [
          {
            lineItemId: 1,
            menuItemId: 5,
            nameAr: "خبز",
            nameEn: "Bread",
            quantity: 1,
            price: "2.00",
            itemNotes: null,
          },
        ],
      })
    );
    expect(text).not.toContain("Note:");
    expect(text).not.toContain("Notes:");
  });
});
