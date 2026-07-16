/**
 * Prepare Arabic (and mixed) strings for pdfkit LTR drawing.
 * Reshape + bidi visual reorder so Cairo glyphs connect and word order reads correctly.
 */
import reshaper from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function preparePdfText(text: string, rtl: boolean): string {
  const input = String(text ?? "");
  if (!rtl || !ARABIC_RE.test(input)) return input;
  const shaped = reshaper.ArabicShaper.convertArabic(input);
  const levels = bidi.getEmbeddingLevels(shaped, "rtl");
  return bidi.getReorderedString(shaped, levels);
}
