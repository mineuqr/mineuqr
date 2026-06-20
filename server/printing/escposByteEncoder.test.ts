import { describe, expect, it } from "vitest";
import { DEFAULT_SEPARATOR_LENGTH } from "./escposConstants";
import { encodeEscPosDocument, EscPosEncodingError } from "./escposByteEncoder";
import { renderEscPosKitchenTicket } from "./escposRenderer";
import type { EscPosDocument } from "./escposTypes";
import { KITCHEN_TICKET_TYPE, type KitchenTicket } from "./ticketTypes";

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

describe("escposByteEncoder THERMAL-PRINTING-4C", () => {
  it("encodes initialize", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "initialize" }] });
    expect(encoded).toEqual(bytes(0x1b, 0x40));
  });

  it("encodes align left", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "align", value: "left" }] });
    expect(encoded).toEqual(bytes(0x1b, 0x61, 0x00));
  });

  it("encodes align center", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "align", value: "center" }] });
    expect(encoded).toEqual(bytes(0x1b, 0x61, 0x01));
  });

  it("encodes align right", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "align", value: "right" }] });
    expect(encoded).toEqual(bytes(0x1b, 0x61, 0x02));
  });

  it("encodes text as UTF-8 with LF", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "text", value: "Kitchen Order" }] });
    expect(encoded).toEqual(concat([utf8("Kitchen Order"), bytes(0x0a)]));
  });

  it("passes Arabic Unicode through unchanged", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "text", value: "2x برجر" }] });
    expect(encoded).toEqual(concat([utf8("2x برجر"), bytes(0x0a)]));
  });

  it("encodes separator using DEFAULT_SEPARATOR_LENGTH", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "separator" }] });
    expect(encoded).toEqual(
      concat([utf8("-".repeat(DEFAULT_SEPARATOR_LENGTH)), bytes(0x0a)])
    );
    expect(DEFAULT_SEPARATOR_LENGTH).toBe(32);
  });

  it("encodes feed lines", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "feed", lines: 2 }] });
    expect(encoded).toEqual(bytes(0x1b, 0x64, 0x02));
  });

  it("encodes cut", () => {
    const encoded = encodeEscPosDocument({ commands: [{ type: "cut" }] });
    expect(encoded).toEqual(bytes(0x1d, 0x56, 0x00));
  });

  it("encodes a minimal full document deterministically", () => {
    const document: EscPosDocument = {
      commands: [
        { type: "initialize" },
        { type: "align", value: "center" },
        { type: "text", value: "Kitchen Order" },
        { type: "feed", lines: 2 },
        { type: "cut" },
      ],
    };

    const encoded = encodeEscPosDocument(document);
    expect(encoded).toEqual(
      concat([
        bytes(0x1b, 0x40),
        bytes(0x1b, 0x61, 0x01),
        utf8("Kitchen Order"),
        bytes(0x0a),
        bytes(0x1b, 0x64, 0x02),
        bytes(0x1d, 0x56, 0x00),
      ])
    );
  });

  it("produces identical bytes for identical documents", () => {
    const document: EscPosDocument = {
      commands: [
        { type: "text", value: "Same" },
        { type: "feed", lines: 1 },
      ],
    };

    expect(encodeEscPosDocument(document)).toEqual(encodeEscPosDocument(document));
  });

  it("rejects invalid feed values", () => {
    expect(() =>
      encodeEscPosDocument({ commands: [{ type: "feed", lines: 0 }] })
    ).toThrow(EscPosEncodingError);
    expect(() =>
      encodeEscPosDocument({ commands: [{ type: "feed", lines: -1 }] })
    ).toThrow(EscPosEncodingError);
  });

  it("rejects unsupported command types", () => {
    expect(() =>
      encodeEscPosDocument({
        commands: [{ type: "unknown" as "initialize" }],
      })
    ).toThrow(EscPosEncodingError);
  });

  it("encodes a full kitchen ticket document from 4B renderer output", () => {
    const ticket: KitchenTicket = {
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
    };

    const document = renderEscPosKitchenTicket(ticket);
    const encoded = encodeEscPosDocument(document);

    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded[0]).toBe(0x1b);
    expect(encoded.slice(-3)).toEqual(Uint8Array.from([0x1d, 0x56, 0x00]));
    expect(encoded.slice(-6, -3)).toEqual(Uint8Array.from([0x1b, 0x64, 0x03]));
  });
});
