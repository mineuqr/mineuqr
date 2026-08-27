/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * Thin POS read router. Authorization + DTO only. No SQL. No mutations.
 */

import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import {
  getPosCatalogReadService,
  getPosCheckReadService,
  getPosOrderReadService,
  getPosOrderSettlementReadService,
} from "../posComposition";
import { mapPosReadError } from "../services/PosReadError";

const terminalScopeInput = z.object({
  restaurantId: z.number().int().positive(),
  terminalId: z.string().uuid(),
});

const listActiveInput = terminalScopeInput.extend({
  status: z.enum(["pending", "preparing", "ready", "all-active"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

const orderDetailInput = terminalScopeInput.extend({
  orderId: z.number().int().positive(),
});

const catalogInput = terminalScopeInput.extend({
  availableOnly: z.boolean().optional(),
});

export const posReadRouter = router({
  orders: router({
    listActive: verifiedProcedure
      .input(listActiveInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderReadService().listActive({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
    getDetail: verifiedProcedure
      .input(orderDetailInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderReadService().getDetail({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
    getTimeline: verifiedProcedure
      .input(orderDetailInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderReadService().getTimeline({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
    getInvoiceIntent: verifiedProcedure
      .input(orderDetailInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderReadService().getInvoiceIntent({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
    listInvoiceIntents: verifiedProcedure
      .input(
        terminalScopeInput.extend({
          limit: z.number().int().positive().max(100).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderReadService().listInvoiceIntents({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
  }),
  check: router({
    getByOrder: verifiedProcedure
      .input(orderDetailInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosCheckReadService().getByOrder({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
  }),
  orderSettlement: router({
    listByOrder: verifiedProcedure
      .input(orderDetailInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosOrderSettlementReadService().listByOrder({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
  }),
  catalog: router({
    listItems: verifiedProcedure
      .input(catalogInput)
      .query(async ({ input, ctx }) => {
        try {
          return await getPosCatalogReadService().listItems({
            user: ctx.user,
            command: input,
          });
        } catch (err) {
          mapPosReadError(err);
        }
      }),
  }),
});
