/**
 * THERMAL-PRINTING-13B — ESC/POS document model (shared single source of truth).
 */

export type EscPosAlign = "left" | "center" | "right";

export type EscPosCommand =
  | { type: "initialize" }
  | { type: "text"; value: string }
  | { type: "align"; value: EscPosAlign }
  | { type: "separator"; line?: string }
  | { type: "feed"; lines: number }
  | { type: "cut" };

export interface EscPosDocument {
  commands: EscPosCommand[];
}
