import { describe, expect, it } from "vitest";
import { renderEscPosKitchenTicket } from "./escposRenderer";
import { KITCHEN_TICKET_TYPE, type KitchenTicket } from "./ticketTypes";

function sampleTicket(overrides: Partial<KitchenTicket> = {}): KitchenTicket {
  return {
    ticketType: KITCHEN_TICKET_TYPE.KITCHEN_ORDER,
    restaurantId: 7,
    orderId: 1001,
    orderNumber: "ORD-01001",
    tableNumber: "12",
    sessionId: 55,
    createdAt: new Date("2026-06-20T12:30:00.000Z"),
    notes: "No onions",
    items: [
      { itemName: "Burger", quantity: 2, notes: null },
      { itemName: "Cola", quantity: 1, notes: "Extra ice" },
    ],
    ...overrides,
  };
}

describe("escposRenderer THERMAL-PRINTING-4B", () => {
  it("renders a simple kitchen ticket document", () => {
    const document = renderEscPosKitchenTicket(
      sampleTicket({
        notes: null,
        items: [{ itemName: "Burger", quantity: 1, notes: null }],
      })
    );

    expect(document.commands.slice(0, 6)).toEqual([
      { type: "initialize" },
      { type: "align", value: "center" },
      { type: "text", value: "Kitchen Order" },
      { type: "align", value: "left" },
      { type: "text", value: "Order Number: ORD-01001" },
      { type: "text", value: "Table Number: 12" },
    ]);
    expect(document.commands.at(-3)).toEqual({ type: "separator" });
    expect(document.commands.at(-2)).toEqual({ type: "feed", lines: 3 });
    expect(document.commands.at(-1)).toEqual({ type: "cut" });
  });

  it("renders multiple items and item notes", () => {
    const document = renderEscPosKitchenTicket(sampleTicket({ notes: null }));

    expect(document.commands).toContainEqual({ type: "text", value: "2x Burger" });
    expect(document.commands).toContainEqual({ type: "text", value: "1x Cola" });
    expect(document.commands).toContainEqual({ type: "text", value: "* Extra ice" });
  });

  it("renders order notes when present", () => {
    const document = renderEscPosKitchenTicket(sampleTicket());

    expect(document.commands).toContainEqual({ type: "text", value: "Order Notes:" });
    expect(document.commands).toContainEqual({ type: "text", value: "No onions" });
  });

  it("omits table and session lines when absent", () => {
    const document = renderEscPosKitchenTicket(
      sampleTicket({ tableNumber: null, sessionId: null, notes: null })
    );

    const textValues = document.commands
      .filter((command) => command.type === "text")
      .map((command) => command.value);

    expect(textValues.some((value) => value.startsWith("Table Number:"))).toBe(false);
    expect(textValues.some((value) => value.startsWith("Session Id:"))).toBe(false);
  });

  it("passes Arabic text through unchanged", () => {
    const document = renderEscPosKitchenTicket(
      sampleTicket({
        notes: "بدون بصل",
        items: [{ itemName: "برجر", quantity: 2, notes: "بدون مخلل" }],
      })
    );

    expect(document.commands).toContainEqual({ type: "text", value: "2x برجر" });
    expect(document.commands).toContainEqual({ type: "text", value: "* بدون مخلل" });
    expect(document.commands).toContainEqual({ type: "text", value: "بدون بصل" });
  });

  it("uses ticket createdAt only for created time", () => {
    const createdAt = new Date("2026-06-20T12:30:00.000Z");
    const document = renderEscPosKitchenTicket(
      sampleTicket({ createdAt, notes: null, tableNumber: null, sessionId: null })
    );

    expect(document.commands).toContainEqual({
      type: "text",
      value: "Created Time: 2026-06-20T12:30:00.000Z",
    });
  });

  it("renders deterministically for identical tickets", () => {
    const ticket = sampleTicket();
    expect(renderEscPosKitchenTicket(ticket)).toEqual(renderEscPosKitchenTicket(ticket));
  });

  it("uses separator commands between sections", () => {
    const document = renderEscPosKitchenTicket(sampleTicket({ notes: null }));
    const separators = document.commands.filter((command) => command.type === "separator");

    expect(separators.length).toBeGreaterThanOrEqual(2);
  });
});
