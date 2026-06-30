import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { printerManagementService } from "../printer-management/printerManagementComposition";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const printerIdInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128),
});

const provisionInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128),
  displayName: z.string().min(1).max(255),
  platform: z.string().min(1).max(32),
  transport: z.enum(["usb", "ethernet", "wifi", "bluetooth"]),
  setAsDefault: z.boolean().optional(),
});

const renameInput = printerIdInput.extend({
  displayName: z.string().min(1).max(255),
});

const testPrintInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128).optional(),
});

/**
 * PRINT-UX-1 — Printer Management workspace (administrative).
 */
export const printerManagementRouter = router({
  read: router({
    listPrinters: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.read.listPrinters");
      return printerManagementService.listPrinters(input.restaurantId);
    }),

    discoverPrinters: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.read.discoverPrinters");
      return printerManagementService.discoverPrinters(input.restaurantId);
    }),

    getDiagnostics: verifiedProcedure.input(printerIdInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.read.getDiagnostics");
      return printerManagementService.getDiagnostics(input.restaurantId, input.printerId);
    }),
  }),

  commands: router({
    provisionPrinter: verifiedProcedure.input(provisionInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.provisionPrinter");
      return printerManagementService.provisionPrinter(input);
    }),

    removePrinter: verifiedProcedure.input(printerIdInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.removePrinter");
      return printerManagementService.removePrinter(input.restaurantId, input.printerId);
    }),

    renamePrinter: verifiedProcedure.input(renameInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.renamePrinter");
      return printerManagementService.renamePrinter(
        input.restaurantId,
        input.printerId,
        input.displayName
      );
    }),

    setDefaultPrinter: verifiedProcedure.input(printerIdInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.setDefaultPrinter");
      return printerManagementService.setDefaultPrinter(input.restaurantId, input.printerId);
    }),

    testPrint: verifiedProcedure.input(testPrintInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.testPrint");
      return printerManagementService.testPrint(input.restaurantId, input.printerId);
    }),
  }),
});
