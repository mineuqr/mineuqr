/**
 * THERMAL-PRINTING-13I.1J — printer provisioning (dashboard write path).
 */
import { TRPCError } from "@trpc/server";
import {
  buildPrintAgentConnectConfig,
  type PrinterConnectConfigRow,
} from "./printAgentConnectConfig";
import {
  insertPrinterForRestaurant,
  listPrintersForRestaurant,
} from "./printerRepository";
import { buildSystemPrinterProfileId } from "./printerProfileId";
import type { CreatedPrinterView } from "./printOperationsProvisioningTypes";

const ALLOWED_PAPER_WIDTHS = new Set([58, 80]);

export async function createRestaurantPrinter(input: {
  restaurantId: number;
  name: string;
  paperWidthMm: number;
  isDefault: boolean;
}): Promise<CreatedPrinterView> {
  const name = input.name.trim();
  if (!name) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Printer name is required" });
  }
  if (!ALLOWED_PAPER_WIDTHS.has(input.paperWidthMm)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Paper width must be 58 or 80 mm" });
  }

  const existing = await listPrintersForRestaurant(input.restaurantId);
  const isDefault = existing.length === 0 ? true : input.isDefault;
  const profileId = buildSystemPrinterProfileId(input.restaurantId);

  const printer = await insertPrinterForRestaurant({
    restaurantId: input.restaurantId,
    name,
    paperWidthMm: input.paperWidthMm,
    profileId,
    isDefault,
  });

  return {
    id: printer.id,
    name: printer.name,
    paperWidthMm: printer.paperWidthMm,
    isDefault: printer.isDefault,
  };
}

export function buildConnectConfigForRestaurant(
  restaurantId: number,
  printers: PrinterConnectConfigRow[]
): Record<string, unknown> | null {
  if (printers.length === 0) {
    return null;
  }
  return buildPrintAgentConnectConfig(restaurantId, printers);
}
