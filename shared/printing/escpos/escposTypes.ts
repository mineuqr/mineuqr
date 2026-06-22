/**
 * THERMAL-PRINTING-13B / 13D — ESC/POS document model (shared single source of truth).
 */
import type { MonochromeBitmap } from "../arabic/monochromeBitmap";

export type EscPosAlign = "left" | "center" | "right";

export type EscPosCommand =
  | { type: "initialize" }
  | { type: "text"; value: string }
  | { type: "align"; value: EscPosAlign }
  | { type: "separator"; line?: string }
  | { type: "raster"; bitmap: MonochromeBitmap }
  | { type: "feed"; lines: number }
  | { type: "cut" };

export interface EscPosDocument {
  commands: EscPosCommand[];
}
