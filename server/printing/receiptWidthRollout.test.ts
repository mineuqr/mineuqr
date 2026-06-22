import { beforeEach, describe, expect, it } from "vitest";
import { PAPER_WIDTH_MM } from "../../shared/printing/types";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { encodeEscPosDocument } from "../../shared/printing/escpos/escposDocumentRenderer";
import { renderReceiptToEscPosDocument } from "../../shared/printing/receiptPipeline";
import { receiptFromAgentJobTicket } from "../../shared/printing/receipts/receiptAdapters";
import { buildReceiptRenderPlan } from "../../shared/printing/receipts/layoutEngine";
import {
  RECEIPT_LAYOUT_PROFILE_LEGACY_V1,
  RECEIPT_LAYOUT_PROFILE_W58,
  RECEIPT_LAYOUT_PROFILE_W80,
  resolveReceiptLayoutProfile,
} from "../../shared/printing/receipts/layoutProfiles";
import {
  resolveLayoutProfileIdFromPaperWidth,
  resolveLayoutProfileIdFromPrinterProfile,
  resolvePaperWidthFromPrinterProfile,
} from "../../shared/printing/receipts/receiptWidthResolution";
import { clearPrinterProfileStore, replaceAgentPrinterInventory } from "./printerProfileStore";
import { resolvePaperWidthForAgentProfile } from "./receiptWidthResolution";
import { createRawEscPosExecutor } from "./executors/rawEscPosExecutor";

const sampleProfile58: PrinterProfile = {
  printerId: "kitchen-58",
  printerName: "Kitchen 58",
  transport: "usb",
  capabilities: {
    escpos: true,
    cutter: false,
    cashDrawer: false,
    qrCode: true,
    imagePrinting: false,
  },
  executionCapabilities: { airprint: false, vendorSdk: false },
  paperWidth: 58,
};

const sampleProfile80: PrinterProfile = {
  ...sampleProfile58,
  printerId: "kitchen-80",
  printerName: "Kitchen 80",
  paperWidth: 80,
};

const sampleAgentTicket = {
  orderId: 500,
  restaurantId: 7,
  items: [
    { itemName: "Burger", quantity: 2, notes: "No onions" },
    { itemName: "Cola", quantity: 1, notes: null },
  ],
};

function separatorLengths(document: ReturnType<typeof renderReceiptToEscPosDocument>): number[] {
  return document.commands
    .filter((command) => command.type === "separator")
    .map((command) => (command.type === "separator" && command.line ? command.line.length : 32));
}

describe("receiptWidthRollout THERMAL-PRINTING-13C", () => {
  beforeEach(() => {
    clearPrinterProfileStore();
  });

  describe("13C.1 — Width resolution strategy", () => {
    it("resolves paper width from printer profile store", () => {
      replaceAgentPrinterInventory({
        agentId: "agent-alpha",
        timestamp: "2026-06-22T10:00:00.000Z",
        profiles: [sampleProfile58, sampleProfile80],
      });

      expect(resolvePaperWidthForAgentProfile({
        agentId: "agent-alpha",
        profilePrinterId: "kitchen-58",
      })).toBe(58);
      expect(resolvePaperWidthForAgentProfile({
        agentId: "agent-alpha",
        profilePrinterId: "kitchen-80",
      })).toBe(80);
    });

    it("maps profile paper width to layout profile ids", () => {
      expect(resolveLayoutProfileIdFromPrinterProfile(sampleProfile58)).toBe("w58");
      expect(resolveLayoutProfileIdFromPrinterProfile(sampleProfile80)).toBe("w80");
      expect(resolveLayoutProfileIdFromPrinterProfile(undefined)).toBe("legacy-v1");
    });

    it("falls back to legacy-v1 for unknown widths", () => {
      expect(resolveLayoutProfileIdFromPaperWidth(undefined)).toBe("legacy-v1");
      expect(resolvePaperWidthFromPrinterProfile({
        ...sampleProfile80,
        paperWidth: 72 as 80,
      })).toBeUndefined();
    });
  });

  describe("13C.2 / 13C.3 — Width propagation and layout selection", () => {
    it("carries paperWidthMm through receipt adapter into render plan", () => {
      const receipt = receiptFromAgentJobTicket(sampleAgentTicket, {
        paperWidthMm: PAPER_WIDTH_MM.W80,
      });
      const profile = resolveReceiptLayoutProfile({ paperWidthMm: receipt.paperWidthMm });

      expect(profile.id).toBe("w80");
      expect(buildReceiptRenderPlan(receipt, profile).profile.separatorLength).toBe(48);
    });

    it("selects w58 layout for 58mm production width", () => {
      const payload = buildEscPosPayloadFromAgentTicket({
        ticket: sampleAgentTicket,
        paperWidthMm: PAPER_WIDTH_MM.W58,
      });
      const document = renderReceiptToEscPosDocument(
        receiptFromAgentJobTicket(sampleAgentTicket, { paperWidthMm: PAPER_WIDTH_MM.W58 })
      );

      expect(separatorLengths(document)).toEqual([32, 32]);
      expect(payload.byteLength).toBeGreaterThan(0);
    });

    it("selects w80 layout for 80mm production width", () => {
      const document = renderReceiptToEscPosDocument(
        receiptFromAgentJobTicket(sampleAgentTicket, { paperWidthMm: PAPER_WIDTH_MM.W80 })
      );

      expect(separatorLengths(document)).toEqual([48, 48]);
    });

    it("uses legacy-v1 when paper width is not provided", () => {
      const withoutWidth = buildEscPosPayloadFromAgentTicket({ ticket: sampleAgentTicket });
      const explicitLegacy = buildEscPosPayloadFromAgentTicket({
        ticket: sampleAgentTicket,
        paperWidthMm: undefined,
      });

      expect(Array.from(withoutWidth.bytes)).toEqual(Array.from(explicitLegacy.bytes));
      expect(
        separatorLengths(
          renderReceiptToEscPosDocument(receiptFromAgentJobTicket(sampleAgentTicket))
        )
      ).toEqual([32, 32]);
    });
  });

  describe("13C.4 — Rendering comparison", () => {
    it("renders header, items, and notes blocks under width-aware profiles", () => {
      const receipt = receiptFromAgentJobTicket(
        {
          ...sampleAgentTicket,
          items: [
            { itemName: "برجر", quantity: 2, notes: "بدون بصل" },
          ],
        },
        { paperWidthMm: PAPER_WIDTH_MM.W80 }
      );
      receipt.notes = { orderNotes: "No onions" };

      const plan = buildReceiptRenderPlan(receipt, RECEIPT_LAYOUT_PROFILE_W80);
      const textLines = plan.blocks
        .filter((block) => block.kind === "line")
        .map((block) => (block.kind === "line" ? block.line.text : ""));

      expect(textLines).toContain("Kitchen Order");
      expect(textLines).toContain("2x برجر");
      expect(textLines).toContain("* بدون بصل");
      expect(textLines).toContain("No onions");
    });

    it("produces wider separators for 80mm than legacy-v1", () => {
      const legacyDoc = renderReceiptToEscPosDocument(
        receiptFromAgentJobTicket(sampleAgentTicket)
      );
      const w80Doc = renderReceiptToEscPosDocument(
        receiptFromAgentJobTicket(sampleAgentTicket, { paperWidthMm: PAPER_WIDTH_MM.W80 })
      );

      const legacyBytes = encodeEscPosDocument(legacyDoc);
      const w80Bytes = encodeEscPosDocument(w80Doc);

      expect(w80Bytes.length).toBeGreaterThan(legacyBytes.length);
      expect(separatorLengths(w80Doc)[0]).toBe(48);
      expect(separatorLengths(legacyDoc)[0]).toBe(32);
    });
  });

  describe("13C.5 — Executor compatibility", () => {
    it("passes paperWidthMm through raw-escpos executor input", () => {
      const executor = createRawEscPosExecutor();
      const w58 = executor.execute({
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        job: {
          jobId: 1,
          restaurantId: 7,
          printerId: 10,
          orderId: 500,
          ticket: sampleAgentTicket,
          paperWidthMm: PAPER_WIDTH_MM.W58,
        },
      });

      const w80 = executor.execute({
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        job: {
          jobId: 1,
          restaurantId: 7,
          printerId: 10,
          orderId: 500,
          ticket: sampleAgentTicket,
          paperWidthMm: PAPER_WIDTH_MM.W80,
        },
      });

      expect(w58.status).toBe("completed");
      expect(w80.status).toBe("completed");
      expect(w58.artifact?.byteLength).not.toEqual(w80.artifact?.byteLength);
    });
  });
});
