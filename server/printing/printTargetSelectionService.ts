/**
 * THERMAL-PRINTING-11A — automatic printer target selection for print jobs.
 */
import {
  findPrinterById,
  findRestaurantPrintSettings,
  listPrintersForRestaurant,
} from "./printerRepository";
import {
  PRINT_TARGET_SELECTION_FAILURE_CODES,
  PRINT_TARGET_SELECTION_REASONS,
  PrintTargetSelectionError,
  type ResolvePrintTargetInput,
  type ResolvePrintTargetResult,
} from "./printTargetSelectionTypes";

function assertRestaurantOwnedPrinter(
  printer: { id: number; restaurantId: number },
  restaurantId: number,
  failureCode:
    | typeof PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_WRONG_RESTAURANT
    | typeof PRINT_TARGET_SELECTION_FAILURE_CODES.DEFAULT_PRINTER_WRONG_RESTAURANT,
  label: string
): void {
  if (printer.restaurantId !== restaurantId) {
    throw new PrintTargetSelectionError(
      failureCode,
      `${label} does not belong to restaurant ${restaurantId}`
    );
  }
}

export async function isAutoPrintEnabledForRestaurant(
  restaurantId: number
): Promise<boolean> {
  const settings = await findRestaurantPrintSettings(restaurantId);
  if (!settings) {
    return true;
  }
  return settings.autoPrintOnNewOrder;
}

export async function resolvePrintTarget(
  input: ResolvePrintTargetInput
): Promise<ResolvePrintTargetResult> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new PrintTargetSelectionError(
      PRINT_TARGET_SELECTION_FAILURE_CODES.NO_PRINTERS_CONFIGURED,
      "Invalid restaurantId"
    );
  }

  if (input.explicitPrinterId != null) {
    if (!Number.isInteger(input.explicitPrinterId) || input.explicitPrinterId <= 0) {
      throw new PrintTargetSelectionError(
        PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_NOT_FOUND,
        "Invalid explicit printerId"
      );
    }

    const printer = await findPrinterById(input.explicitPrinterId);
    if (!printer) {
      throw new PrintTargetSelectionError(
        PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_NOT_FOUND,
        `Printer ${input.explicitPrinterId} not found`
      );
    }

    assertRestaurantOwnedPrinter(
      printer,
      input.restaurantId,
      PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_WRONG_RESTAURANT,
      `Printer ${input.explicitPrinterId}`
    );

    return {
      dbPrinterId: printer.id,
      reason: PRINT_TARGET_SELECTION_REASONS.EXPLICIT,
    };
  }

  const settings = await findRestaurantPrintSettings(input.restaurantId);
  if (settings?.defaultPrinterId != null) {
    const defaultPrinter = await findPrinterById(settings.defaultPrinterId);
    if (!defaultPrinter) {
      throw new PrintTargetSelectionError(
        PRINT_TARGET_SELECTION_FAILURE_CODES.DEFAULT_PRINTER_NOT_FOUND,
        `Default printer ${settings.defaultPrinterId} not found`
      );
    }

    assertRestaurantOwnedPrinter(
      defaultPrinter,
      input.restaurantId,
      PRINT_TARGET_SELECTION_FAILURE_CODES.DEFAULT_PRINTER_WRONG_RESTAURANT,
      `Default printer ${settings.defaultPrinterId}`
    );

    return {
      dbPrinterId: defaultPrinter.id,
      reason: PRINT_TARGET_SELECTION_REASONS.SETTINGS_DEFAULT,
    };
  }

  const restaurantPrinters = await listPrintersForRestaurant(input.restaurantId);

  const defaultFlaggedPrinters = restaurantPrinters.filter((printer) => printer.isDefault);
  if (defaultFlaggedPrinters.length === 1) {
    return {
      dbPrinterId: defaultFlaggedPrinters[0]!.id,
      reason: PRINT_TARGET_SELECTION_REASONS.PRINTER_IS_DEFAULT,
    };
  }
  if (defaultFlaggedPrinters.length > 1) {
    throw new PrintTargetSelectionError(
      PRINT_TARGET_SELECTION_FAILURE_CODES.AMBIGUOUS_DEFAULT_FLAG,
      "Multiple printers are marked as default; configure restaurantPrintSettings.defaultPrinterId"
    );
  }

  if (restaurantPrinters.length === 1) {
    return {
      dbPrinterId: restaurantPrinters[0]!.id,
      reason: PRINT_TARGET_SELECTION_REASONS.SINGLE_PRINTER,
    };
  }

  if (restaurantPrinters.length === 0) {
    throw new PrintTargetSelectionError(
      PRINT_TARGET_SELECTION_FAILURE_CODES.NO_PRINTERS_CONFIGURED,
      "No printers configured for this restaurant"
    );
  }

  throw new PrintTargetSelectionError(
    PRINT_TARGET_SELECTION_FAILURE_CODES.AMBIGUOUS_PRINTERS,
    "Multiple printers configured and no default selected; configure restaurantPrintSettings.defaultPrinterId"
  );
}
