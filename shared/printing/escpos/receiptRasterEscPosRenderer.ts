/**
 * THERMAL-PRINTING-13D.4 — receipt bitmap → ESC/POS document commands.
 */
import type { MonochromeBitmap } from "../arabic/monochromeBitmap";
import type { EscPosDocument } from "./escposTypes";

export function receiptBitmapToEscPosDocument(
  bitmap: MonochromeBitmap,
  footer: { feedLines: number; cut: boolean }
): EscPosDocument {
  const commands: EscPosDocument["commands"] = [
    { type: "initialize" },
    { type: "raster", bitmap },
  ];

  if (footer.feedLines > 0) {
    commands.push({ type: "feed", lines: footer.feedLines });
  }
  if (footer.cut) {
    commands.push({ type: "cut" });
  }

  return { commands };
}
