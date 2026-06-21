/**
 * THERMAL-PRINTING-11A — print target selection model.
 */

export const PRINT_TARGET_SELECTION_REASONS = {
  EXPLICIT: "explicit",
  SETTINGS_DEFAULT: "settings-default",
  PRINTER_IS_DEFAULT: "printer-is-default",
  SINGLE_PRINTER: "single-printer",
} as const;

export type PrintTargetSelectionReason =
  (typeof PRINT_TARGET_SELECTION_REASONS)[keyof typeof PRINT_TARGET_SELECTION_REASONS];

export const PRINT_TARGET_SELECTION_FAILURE_CODES = {
  EXPLICIT_PRINTER_NOT_FOUND: "explicit-printer-not-found",
  EXPLICIT_PRINTER_WRONG_RESTAURANT: "explicit-printer-wrong-restaurant",
  DEFAULT_PRINTER_NOT_FOUND: "default-printer-not-found",
  DEFAULT_PRINTER_WRONG_RESTAURANT: "default-printer-wrong-restaurant",
  AMBIGUOUS_DEFAULT_FLAG: "ambiguous-default-flag",
  NO_PRINTERS_CONFIGURED: "no-printers-configured",
  AMBIGUOUS_PRINTERS: "ambiguous-printers",
} as const;

export type PrintTargetSelectionFailureCode =
  (typeof PRINT_TARGET_SELECTION_FAILURE_CODES)[keyof typeof PRINT_TARGET_SELECTION_FAILURE_CODES];

export class PrintTargetSelectionError extends Error {
  constructor(
    public readonly code: PrintTargetSelectionFailureCode,
    message: string
  ) {
    super(message);
    this.name = "PrintTargetSelectionError";
  }
}

export type ResolvePrintTargetInput = {
  restaurantId: number;
  explicitPrinterId?: number;
};

export type ResolvePrintTargetResult = {
  dbPrinterId: number;
  reason: PrintTargetSelectionReason;
};
