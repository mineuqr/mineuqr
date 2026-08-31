/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Read-only Tax Invoice retrieval for Phase 1 electronic documents.
 * Not Cashier financial mutation. Not Phase 2 integration APIs.
 */

import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import {
  getSaudiTaxInvoicePhase1View,
  getSaudiTaxInvoicePhase1ViewByOrder,
} from "./saudiTaxInvoicePhase1ViewService";

export const saudiTaxInvoiceRouter = router({
  getPhase1ById: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        taxInvoiceId: z.string().min(1).max(128),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "saudiTaxInvoice.getPhase1ById"
      );
      return getSaudiTaxInvoicePhase1View(input);
    }),

  getPhase1ByOrder: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "saudiTaxInvoice.getPhase1ByOrder"
      );
      return getSaudiTaxInvoicePhase1ViewByOrder(input);
    }),
});
