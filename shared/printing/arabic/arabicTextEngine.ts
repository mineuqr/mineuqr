/**
 * THERMAL-PRINTING-13D.2 — Arabic text processing (platform-neutral, no ESC/POS).
 *
 * Shaping, RTL ordering, bidi, mixed Arabic/English, and locale-aware numerals.
 */
import bidiFactory from "bidi-js";
import reshaper from "arabic-persian-reshaper";
import { PRINT_TICKET_LOCALE } from "../types";
import type { ReceiptLineAlignment, ReceiptRenderPlan } from "../receipts/layoutEngine";
import type { TextDirection } from "../receipts/receiptLocale";
import type { ReceiptLocale } from "../receipts/receiptLocale";
import { containsArabicScript } from "./arabicContent";

const bidi = bidiFactory();
const { ArabicShaper } = reshaper as {
  ArabicShaper: { convertArabic: (text: string) => string };
};

export type RenderableReceiptLine = {
  visualText: string;
  alignment: ReceiptLineAlignment;
  textDirection: TextDirection;
  isSeparator: boolean;
};

export type RenderableReceipt = {
  locale: ReceiptLocale;
  lines: RenderableReceiptLine[];
  feedLines: number;
  cut: boolean;
};

const EASTERN_ARABIC_ZERO = 0x0660;

export function toEasternArabicNumerals(value: string): string {
  return value.replace(/\d/g, (digit) =>
    String.fromCharCode(EASTERN_ARABIC_ZERO + Number(digit))
  );
}

export function formatLocaleAwarePrice(value: string, locale: ReceiptLocale): string {
  if (locale === PRINT_TICKET_LOCALE.AR) {
    return toEasternArabicNumerals(value);
  }
  return value;
}

function shapeArabicRuns(text: string): string {
  if (!containsArabicScript(text)) {
    return text;
  }
  return ArabicShaper.convertArabic(text);
}

function resolveBaseDirection(textDirection: TextDirection): "ltr" | "rtl" {
  return textDirection === "rtl" ? "rtl" : "ltr";
}

/**
 * Produces visual-order text suitable for raster rendering.
 */
export function processReceiptText(
  text: string,
  textDirection: TextDirection
): string {
  const shaped = shapeArabicRuns(text);
  const baseDirection = resolveBaseDirection(textDirection);
  const embeddingLevels = bidi.getEmbeddingLevels(shaped, baseDirection);
  return bidi.getReorderedString(shaped, embeddingLevels);
}

export function processReceiptLine(input: {
  text: string;
  alignment: ReceiptLineAlignment;
  textDirection: TextDirection;
  isSeparator?: boolean;
  locale?: ReceiptLocale;
}): RenderableReceiptLine {
  let text = input.text;
  if (input.locale === PRINT_TICKET_LOCALE.AR && /\d/.test(text)) {
    text = toEasternArabicNumerals(text);
  }

  return {
    visualText: input.isSeparator ? text : processReceiptText(text, input.textDirection),
    alignment: input.alignment,
    textDirection: input.textDirection,
    isSeparator: input.isSeparator ?? false,
  };
}

export function buildRenderableReceiptFromPlan(plan: ReceiptRenderPlan): RenderableReceipt {
  const lines: RenderableReceiptLine[] = [];

  for (const block of plan.blocks) {
    if (block.kind === "separator") {
      lines.push(
        processReceiptLine({
          text: block.line,
          alignment: "center",
          textDirection: plan.receipt.defaultTextDirection,
          isSeparator: true,
          locale: plan.receipt.locale,
        })
      );
      continue;
    }

    lines.push(
      processReceiptLine({
        text: block.line.text,
        alignment: block.line.alignment,
        textDirection: block.line.textDirection,
        locale: plan.receipt.locale,
      })
    );
  }

  return {
    locale: plan.receipt.locale,
    lines,
    feedLines: plan.feedLines,
    cut: plan.cut,
  };
}
