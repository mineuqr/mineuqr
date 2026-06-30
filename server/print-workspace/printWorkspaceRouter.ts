import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { printWorkspaceCommandService } from "./commands/PrintWorkspaceCommandService";
import { printWorkspaceReadService } from "./read/services/PrintWorkspaceReadService";
import { printerManagementService } from "../printer-management/printerManagementComposition";
import { printWorkspacePresenceReadService } from "./printWorkspacePresenceComposition";
import { printWorkspaceDiscoveryReadService } from "./printWorkspaceDiscoveryComposition";

const listOrdersInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  view: z.enum(["awaiting", "completed", "all"]).optional(),
  status: z.enum(["pending", "preparing", "ready", "served", "cancelled"]).optional(),
  search: z.string().max(128).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

const orderDetailInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive(),
});

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const testPrintInput = restaurantInput.extend({
  printerId: z.string().min(1).max(128).optional(),
});

const actionContextInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive(),
  orderNumber: z.string().min(1).max(32),
});

const reprintInput = actionContextInput.extend({
  reason: z.string().max(256).optional(),
});

const markPrintedInput = actionContextInput.extend({
  printedAt: z.string().optional(),
});

const cancelPrintInput = actionContextInput.extend({
  reason: z.string().max(256).optional(),
});

/**
 * PRINT-WORKSPACE-1 read + PRINTING-1 command contracts.
 */
export const printWorkspaceRouter = router({
  read: router({
    listOrders: verifiedProcedure.input(listOrdersInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.listOrders");
      return printWorkspaceReadService.listOrders(input);
    }),

    getOrderDetail: verifiedProcedure.input(orderDetailInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.getOrderDetail");
      return printWorkspaceReadService.getOrderDetail(input);
    }),

    previewTicket: verifiedProcedure.input(orderDetailInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.previewTicket");
      return printWorkspaceReadService.previewTicket(input);
    }),

    getCurrentPrinter: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.getCurrentPrinter");
      return printerManagementService.getCurrentPrinter(input.restaurantId);
    }),

    getLocalConnectorStatus: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "printWorkspace.read.getLocalConnectorStatus"
      );
      return printWorkspacePresenceReadService.getLocalConnectorStatus(input.restaurantId);
    }),

    getConnectorSessionStatus: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "printWorkspace.read.getConnectorSessionStatus"
      );
      return printWorkspacePresenceReadService.getConnectorSessionStatus(input.restaurantId);
    }),

    getDiagnosticsSummary: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "printWorkspace.read.getDiagnosticsSummary"
      );
      return printWorkspacePresenceReadService.getDiagnosticsSummary(input.restaurantId);
    }),

    getTechnicalReport: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.getTechnicalReport");
      return printWorkspacePresenceReadService.getTechnicalReport(input.restaurantId);
    }),

    discoverPrinters: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.discoverPrinters");
      return printWorkspaceDiscoveryReadService.discoverPrinters(input.restaurantId);
    }),
  }),

  commands: router({
    printOrder: verifiedProcedure.input(actionContextInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.commands.printOrder");
      await printWorkspaceCommandService.printOrder({
        ...input,
        operatorUserId: ctx.user.id,
      });
    }),

    reprint: verifiedProcedure.input(reprintInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.commands.reprint");
      await printWorkspaceCommandService.reprint({
        ...input,
        operatorUserId: ctx.user.id,
      });
    }),

    markPrinted: verifiedProcedure.input(markPrintedInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.commands.markPrinted");
      await printWorkspaceCommandService.markPrinted({
        ...input,
        operatorUserId: ctx.user.id,
      });
    }),

    cancelPrint: verifiedProcedure.input(cancelPrintInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.commands.cancelPrint");
      await printWorkspaceCommandService.cancelPrint({
        ...input,
        operatorUserId: ctx.user.id,
      });
    }),

    testPrint: verifiedProcedure.input(testPrintInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.commands.testPrint");
      return printerManagementService.testPrint(input.restaurantId, input.printerId);
    }),
  }),
});
