import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { printConnectorRuntime } from "../print-connector/printConnectorComposition";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const printerIdInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128),
});

const selectPrinterInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128),
  printerName: z.string().min(1).max(255),
  platform: z.string().min(1).max(32),
  transport: z.enum(["usb", "ethernet", "wifi", "bluetooth"]),
});

const cancelInput = restaurantInput.extend({
  executionId: z.string().uuid(),
  printJobId: z.coerce.number().int().positive(),
});

/**
 * PRINT-CONNECTOR-1 — platform-independent connector API for workspace.
 */
export const printConnectorRouter = router({
  discoverPrinters: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.discoverPrinters");
    return printConnectorRuntime.discoverPrinters(input);
  }),

  getPrinterCapabilities: verifiedProcedure.input(printerIdInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.getPrinterCapabilities");
    return printConnectorRuntime.getPrinterCapabilities(input);
  }),

  getSelectedPrinter: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.getSelectedPrinter");
    return printConnectorRuntime.getSelectedPrinter(input.restaurantId);
  }),

  getStatus: verifiedProcedure.input(printerIdInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.getStatus");
    return printConnectorRuntime.getStatus(input);
  }),

  selectPrinter: verifiedProcedure.input(selectPrinterInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.selectPrinter");
    return printConnectorRuntime.selectPrinter(input);
  }),

  cancel: verifiedProcedure.input(cancelInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printConnector.cancel");
    return printConnectorRuntime.cancel(input);
  }),
});
