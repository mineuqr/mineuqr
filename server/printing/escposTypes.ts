/**
 * THERMAL-PRINTING-4B — printer-independent ESC/POS document model (not raw bytes).
 */

export type EscPosAlign = "left" | "center" | "right";

export type EscPosCommand =
  | { type: "initialize" }
  | { type: "text"; value: string }
  | { type: "align"; value: EscPosAlign }
  | { type: "separator" }
  | { type: "feed"; lines: number }
  | { type: "cut" };

export interface EscPosDocument {
  commands: EscPosCommand[];
}
