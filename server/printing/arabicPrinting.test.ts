import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  normalizeArabicRenderingMode,
} from "../../shared/printing/arabic/arabicRenderingMode";
import {
  containsArabicScript,
  receiptContainsArabicScript,
  receiptRequiresArabicRendering,
} from "../../shared/printing/arabic/arabicContent";
import {
  buildRenderableReceiptFromPlan,
  formatLocaleAwarePrice,
  processReceiptText,
  toEasternArabicNumerals,
} from "../../shared/printing/arabic/arabicTextEngine";
import {
  RECEIPT_RASTER_WIDTH_PX,
  resolveReceiptRasterWidthPx,
} from "../../shared/printing/arabic/receiptBitmapConstants";
import { renderRenderableReceiptToBitmap } from "../../shared/printing/arabic/receiptBitmapRenderer";
import { bitmapContainsInk } from "../../shared/printing/escpos/escposRasterEncoder";
import { encodeEscPosDocument } from "../../shared/printing/escpos/escposDocumentRenderer";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { renderReceiptToEscPosDocument, renderReceiptToEscPosPayload } from "../../shared/printing/receiptPipeline";
import { resolveReceiptRenderingPath } from "../../shared/printing/arabic/receiptRenderingStrategy";
import { receiptFromAgentJobTicket } from "../../shared/printing/receipts/receiptAdapters";
import { buildReceiptRenderPlan } from "../../shared/printing/receipts/layoutEngine";
import { RECEIPT_LAYOUT_PROFILE_W58, RECEIPT_LAYOUT_PROFILE_W80 } from "../../shared/printing/receipts/layoutProfiles";
import {
  validatePrinterProfile,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";
import { PAPER_WIDTH_MM, PRINT_TICKET_LOCALE } from "../../shared/printing/types";

const englishTicket = {
  orderId: 500,
  restaurantId: 7,
  items: [{ itemName: "Burger", quantity: 2, notes: "No onions" }],
};

const arabicTicket = {
  orderId: 501,
  restaurantId: 7,
  items: [{ itemName: "برجر", quantity: 2, notes: "بدون بصل" }],
};

const mixedTicket = {
  orderId: 502,
  restaurantId: 7,
  items: [{ itemName: "Burger برجر", quantity: 1, notes: null }],
};

function hasGsV0Raster(bytes: Uint8Array): boolean {
  for (let index = 0; index < bytes.length - 3; index++) {
    if (bytes[index] === 0x1d && bytes[index + 1] === 0x76 && bytes[index + 2] === 0x30) {
      return true;
    }
  }
  return false;
}

describe("arabicPrinting THERMAL-PRINTING-13D", () => {
  describe("13D.1 — Arabic rendering capability model", () => {
    it("defaults missing printer profile mode to auto", () => {
      const profile = validatePrinterProfile({
        printerId: "kitchen",
        printerName: "Kitchen",
        transport: "usb",
        paperWidth: 80,
        capabilities: {
          escpos: true,
          cutter: false,
          cashDrawer: false,
          qrCode: true,
          imagePrinting: true,
        },
        executionCapabilities: { airprint: false, vendorSdk: false },
      } satisfies PrinterProfile);

      expect(profile.arabicRenderingMode).toBe(DEFAULT_ARABIC_RENDERING_MODE);
      expect(normalizeArabicRenderingMode(undefined)).toBe("auto");
      expect(normalizeArabicRenderingMode("raster")).toBe("raster");
    });
  });

  describe("13D.2 — Arabic text processing engine", () => {
    it("detects Arabic script and shapes mixed content", () => {
      expect(containsArabicScript("Burger")).toBe(false);
      expect(containsArabicScript("برجر")).toBe(true);
      expect(processReceiptText("Hello برجر", "inherit").length).toBeGreaterThan(0);
    });

    it("converts prices to Eastern Arabic numerals for AR locale", () => {
      expect(toEasternArabicNumerals("125.50")).toBe("١٢٥.٥٠");
      expect(formatLocaleAwarePrice("99.00", PRINT_TICKET_LOCALE.AR)).toBe("٩٩.٠٠");
    });

    it("builds renderable receipt lines from layout plan", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket, {
        locale: PRINT_TICKET_LOCALE.AR,
        paperWidthMm: PAPER_WIDTH_MM.W80,
      });
      receipt.totals = { total: "45.00", currency: "SAR" };
      const renderable = buildRenderableReceiptFromPlan(
        buildReceiptRenderPlan(receipt, RECEIPT_LAYOUT_PROFILE_W80)
      );

      expect(renderable.lines.some((line) => containsArabicScript(line.visualText))).toBe(true);
      expect(renderable.lines.some((line) => /[٠-٩]/.test(line.visualText))).toBe(true);
    });
  });

  describe("13D.3 / 13D.4 — Raster renderer and ESC/POS encoder", () => {
    it("renders Arabic receipt lines to inked bitmap", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket, {
        locale: PRINT_TICKET_LOCALE.AR,
        paperWidthMm: PAPER_WIDTH_MM.W58,
      });
      const renderable = buildRenderableReceiptFromPlan(
        buildReceiptRenderPlan(receipt, RECEIPT_LAYOUT_PROFILE_W58)
      );
      const bitmap = renderRenderableReceiptToBitmap(renderable, {
        widthPx: RECEIPT_RASTER_WIDTH_PX[PAPER_WIDTH_MM.W58],
      });

      expect(bitmap.width).toBe(384);
      expect(bitmapContainsInk(bitmap)).toBe(true);
    });

    it("encodes raster output using GS v 0", () => {
      const document = renderReceiptToEscPosDocument(
        receiptFromAgentJobTicket(arabicTicket, { paperWidthMm: PAPER_WIDTH_MM.W80 }),
        { arabicRenderingMode: "raster" }
      );

      expect(document.commands.some((command) => command.type === "raster")).toBe(true);
      const bytes = encodeEscPosDocument(document);
      expect(hasGsV0Raster(bytes)).toBe(true);
    });
  });

  describe("13D.5 — Rendering strategy selection", () => {
    it("selects raster for auto mode when Arabic content is present", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket);
      expect(resolveReceiptRenderingPath({ arabicRenderingMode: "auto", receipt })).toBe(
        "arabic-raster"
      );
      expect(receiptRequiresArabicRendering(receipt)).toBe(true);
      expect(receiptContainsArabicScript(receipt)).toBe(true);
    });

    it("keeps legacy path for disabled mode and English receipts", () => {
      const englishReceipt = receiptFromAgentJobTicket(englishTicket);
      expect(resolveReceiptRenderingPath({ arabicRenderingMode: "disabled", receipt: englishReceipt })).toBe(
        "legacy-escpos"
      );
      expect(resolveReceiptRenderingPath({ arabicRenderingMode: "auto", receipt: englishReceipt })).toBe(
        "legacy-escpos"
      );
    });
  });

  describe("13D.6 — Production validation scenarios", () => {
    it("Scenario A — Arabic item names via raster path", () => {
      const payload = buildEscPosPayloadFromAgentTicket({
        ticket: arabicTicket,
        paperWidthMm: PAPER_WIDTH_MM.W80,
        arabicRenderingMode: "auto",
      });
      expect(hasGsV0Raster(payload.bytes)).toBe(true);
    });

    it("Scenario B — mixed Arabic and English items", () => {
      const payload = buildEscPosPayloadFromAgentTicket({
        ticket: mixedTicket,
        arabicRenderingMode: "auto",
      });
      expect(hasGsV0Raster(payload.bytes)).toBe(true);
    });

    it("Scenario C — Arabic totals and prices", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket, {
        locale: PRINT_TICKET_LOCALE.AR,
        paperWidthMm: PAPER_WIDTH_MM.W80,
      });
      receipt.totals = { subtotal: "40.00", total: "45.00", currency: "ر.س" };
      const payload = renderReceiptToEscPosPayload(receipt, { arabicRenderingMode: "raster" });
      expect(hasGsV0Raster(payload.bytes)).toBe(true);
    });

    it("Scenario D — 58mm Arabic receipt width", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket, {
        paperWidthMm: PAPER_WIDTH_MM.W58,
      });
      const document = renderReceiptToEscPosDocument(receipt, { arabicRenderingMode: "raster" });
      const raster = document.commands.find((command) => command.type === "raster");
      expect(raster?.type).toBe("raster");
      if (raster?.type === "raster") {
        expect(raster.bitmap.width).toBe(resolveReceiptRasterWidthPx(PAPER_WIDTH_MM.W58));
      }
    });

    it("Scenario E — 80mm Arabic receipt width", () => {
      const receipt = receiptFromAgentJobTicket(arabicTicket, {
        paperWidthMm: PAPER_WIDTH_MM.W80,
      });
      const document = renderReceiptToEscPosDocument(receipt, { arabicRenderingMode: "raster" });
      const raster = document.commands.find((command) => command.type === "raster");
      expect(raster?.type).toBe("raster");
      if (raster?.type === "raster") {
        expect(raster.bitmap.width).toBe(resolveReceiptRasterWidthPx(PAPER_WIDTH_MM.W80));
      }
    });

    it("Scenario F — legacy English receipt remains unchanged", () => {
      const createdAt = new Date("2026-06-18T10:00:00.000Z");
      const baseline = buildEscPosPayloadFromAgentTicket({
        ticket: englishTicket,
        createdAt,
        arabicRenderingMode: "disabled",
      });
      const autoEnglish = buildEscPosPayloadFromAgentTicket({
        ticket: englishTicket,
        createdAt,
        arabicRenderingMode: "auto",
      });

      expect(Array.from(autoEnglish.bytes)).toEqual(Array.from(baseline.bytes));
      expect(hasGsV0Raster(autoEnglish.bytes)).toBe(false);
    });
  });
});
