/**
 * THERMAL-PRINTING-13D.3 — shared receipt font resolution (Cairo).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";

const RECEIPT_FONT_FAMILY = "CairoReceipt";
let fontRegistered = false;

function candidateFontPaths(): string[] {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return [
    join(process.cwd(), "assets/Cairo-Variable.ttf"),
    join(process.cwd(), "server/assets/Cairo-Variable.ttf"),
    join(moduleDir, "assets/Cairo-Variable.ttf"),
    join(moduleDir, "../../../server/assets/Cairo-Variable.ttf"),
  ];
}

export function resolveReceiptFontPath(): string {
  for (const candidate of candidateFontPaths()) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("Cairo receipt font not found (server/assets/Cairo-Variable.ttf)");
}

export function ensureReceiptFontRegistered(): string {
  if (!fontRegistered) {
    const fontPath = resolveReceiptFontPath();
    GlobalFonts.registerFromPath(fontPath, RECEIPT_FONT_FAMILY);
    fontRegistered = true;
  }
  return RECEIPT_FONT_FAMILY;
}
