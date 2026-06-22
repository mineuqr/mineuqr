import { describe, expect, it } from "vitest";
import { encodeEscPosDocument } from "../../shared/printing/escpos/escposDocumentRenderer";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { renderReceiptToEscPosDocument, renderReceiptToEscPosPayload } from "../../shared/printing/receiptPipeline";
import { receiptFromAgentJobTicket, receiptFromKitchenTicket } from "../../shared/printing/receipts/receiptAdapters";
import { buildReceiptRenderPlan } from "../../shared/printing/receipts/layoutEngine";
import {
  RECEIPT_LAYOUT_PROFILE_LEGACY_V1,
  RECEIPT_LAYOUT_PROFILE_W58,
  RECEIPT_LAYOUT_PROFILE_W80,
  buildSeparatorLine,
} from "../../shared/printing/receipts/layoutProfiles";
import { resolveReceiptDirectionProfile } from "../../shared/printing/receipts/receiptLocale";
import { getReceiptLabels } from "../../shared/printing/receipts/receiptLabels";
import { PAPER_WIDTH_MM, PRINT_TICKET_LOCALE } from "../../shared/printing/types";

const sampleAgentTicket = {
  orderId: 500,
  restaurantId: 7,
  items: [{ itemName: "Burger", quantity: 2, notes: "No onions" }],
};

describe("receipt rendering THERMAL-PRINTING-13B", () => {
  it("defines width-aware layout profiles for 58mm and 80mm", () => {
    expect(RECEIPT_LAYOUT_PROFILE_W58.charactersPerLine).toBe(32);
    expect(RECEIPT_LAYOUT_PROFILE_W58.separatorLength).toBe(32);
    expect(RECEIPT_LAYOUT_PROFILE_W80.charactersPerLine).toBe(48);
    expect(RECEIPT_LAYOUT_PROFILE_W80.separatorLength).toBe(48);
    expect(buildSeparatorLine(RECEIPT_LAYOUT_PROFILE_W80).length).toBe(48);
  });

  it("preserves legacy-v1 production separator width", () => {
    expect(RECEIPT_LAYOUT_PROFILE_LEGACY_V1.separatorLength).toBe(32);
  });

  it("exposes locale direction profiles without applying RTL layout", () => {
    expect(resolveReceiptDirectionProfile(PRINT_TICKET_LOCALE.EN)).toEqual({
      locale: PRINT_TICKET_LOCALE.EN,
      layoutDirection: "ltr",
      defaultTextDirection: "ltr",
    });
    expect(resolveReceiptDirectionProfile(PRINT_TICKET_LOCALE.AR)).toEqual({
      locale: PRINT_TICKET_LOCALE.AR,
      layoutDirection: "rtl",
      defaultTextDirection: "rtl",
    });
  });

  it("provides locale label sets for English and Arabic", () => {
    expect(getReceiptLabels(PRINT_TICKET_LOCALE.EN).kitchenOrderTitle).toBe("Kitchen Order");
    expect(getReceiptLabels(PRINT_TICKET_LOCALE.AR).kitchenOrderTitle).toBe("طلب مطبخ");
  });

  it("builds a canonical receipt from kitchen ticket input", () => {
    const receipt = receiptFromKitchenTicket({
      ticketType: "kitchen-order",
      restaurantId: 7,
      orderId: 1001,
      orderNumber: "ORD-01001",
      tableNumber: "12",
      sessionId: 55,
      createdAt: new Date("2026-06-20T12:30:00.000Z"),
      notes: "No onions",
      items: [{ itemName: "برجر", quantity: 2, notes: null }],
    });

    expect(receipt.metadata.orderNumber).toBe("ORD-01001");
    expect(receipt.items[0]?.name).toBe("برجر");
    expect(receipt.paperWidthMm).toBe(PAPER_WIDTH_MM.W80);
  });

  it("preserves production agent-ticket ESC/POS bytes via legacy profile", () => {
    const createdAt = new Date("2026-06-18T10:00:00.000Z");
    const unified = renderReceiptToEscPosPayload(
      receiptFromAgentJobTicket(sampleAgentTicket, { createdAt }),
      { layoutProfileId: "legacy-v1" }
    );
    const legacy = buildEscPosPayloadFromAgentTicket({
      ticket: sampleAgentTicket,
      createdAt,
    });

    expect(Array.from(unified.bytes)).toEqual(Array.from(legacy.bytes));
  });

  it("renders Arabic item text through unified pipeline", () => {
    const receipt = receiptFromAgentJobTicket({
      orderId: 1,
      restaurantId: 7,
      items: [{ itemName: "برجر", quantity: 2, notes: null }],
    });
    const document = renderReceiptToEscPosDocument(receipt, { layoutProfileId: "legacy-v1" });
    const encoded = encodeEscPosDocument(document);
    const text = new TextDecoder().decode(encoded);

    expect(text).toContain("برجر");
  });

  it("uses width-aware separators when w80 profile is selected", () => {
    const receipt = receiptFromAgentJobTicket(sampleAgentTicket);
    const plan = buildReceiptRenderPlan(receipt, RECEIPT_LAYOUT_PROFILE_W80);
    const separator = plan.blocks.find((block) => block.kind === "separator");

    expect(separator?.kind).toBe("separator");
    if (separator?.kind === "separator") {
      expect(separator.line.length).toBe(48);
    }
  });
});
