/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1
 * POS-SALE-ORDER-IMPLEMENTATION-1
 * POS-CHECK-INTAKE-IMPLEMENTATION-1
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1
 * Thin POS router. Sale, Check Intake, and Settlement Initiation orchestrate
 * through POS services. No public paid-settlement endpoint, payment, refund,
 * Register, or Shift APIs.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { POS_PERMISSIONS } from "@shared/pos";
import { router, verifiedProcedure } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import {
  getPosAccessService,
  getPosEntitlementService,
  getPosGrantStore,
  getPosCheckIntakeService,
  getPosSaleService,
  getPosSettlementInitiateService,
  getPosTerminalService,
} from "../posComposition";
import { PosCheckIntakeError } from "../services/PosCheckIntakeService";
import { PosEntitlementDeniedError } from "../services/PosEntitlementService";
import { PosSaleError } from "../services/PosSaleService";
import { PosSettlementInitiateError } from "../services/PosSettlementInitiateService";
import { PosTerminalError } from "../services/PosTerminalService";

const restaurantInput = z.object({
  restaurantId: z.number().int().positive(),
});

const terminalInput = restaurantInput.extend({
  terminalId: z.string().uuid(),
});

const grantInput = restaurantInput.extend({
  userId: z.number().int().positive(),
  permission: z.enum(POS_PERMISSIONS),
});

const saleItemInput = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
  modifiers: z.array(z.string().min(1).max(128)).max(32).optional().nullable(),
});

const saleCreateInput = terminalInput.extend({
  items: z.array(saleItemInput).min(1).max(100),
  notes: z.string().max(2000).optional().nullable(),
  sessionId: z.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().min(8).max(128),
});

const checkIntakeInput = terminalInput.extend({
  orderId: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(128),
});

const settlementInitiateInput = terminalInput.extend({
  orderId: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(128),
});

const SALE_FORBIDDEN_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
  "invalid_session",
  "order_wrong_restaurant",
  "order_not_found",
  "order_not_eligible",
  "check_not_open",
  "check_wrong_restaurant",
]);

function mapPosError(err: unknown): never {
  if (err instanceof PosEntitlementDeniedError) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "غير مصرح بالوصول",
      cause: err,
    });
  }
  if (err instanceof PosTerminalError) {
    throw new TRPCError({
      code: err.code === "not_found" ? "NOT_FOUND" : "BAD_REQUEST",
      message: err.message,
    });
  }
  if (
    err instanceof PosSaleError ||
    err instanceof PosCheckIntakeError ||
    err instanceof PosSettlementInitiateError
  ) {
    if (err.code === "idempotency_conflict" || err.code === "concurrency_conflict") {
      throw new TRPCError({ code: "CONFLICT", message: err.message });
    }
    if (SALE_FORBIDDEN_CODES.has(err.code)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  throw err;
}

export const posRouter = router({
  entitlement: router({
    get: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.entitlement.get");
      return getPosEntitlementService().resolve(input.restaurantId);
    }),
  }),
  terminal: router({
    list: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.terminal.list");
      return getPosTerminalService().list(input.restaurantId);
    }),
    register: verifiedProcedure
      .input(restaurantInput.extend({ code: z.string().min(3).max(32).optional() }))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(ctx, input.restaurantId, "pos.terminal.register");
        try {
          return await getPosTerminalService().register({
            restaurantId: input.restaurantId,
            actorId: ctx.user.id,
            code: input.code,
          });
        } catch (err) {
          mapPosError(err);
        }
      }),
    activate: verifiedProcedure.input(terminalInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.terminal.activate");
      try {
        return await getPosTerminalService().activate({
          restaurantId: input.restaurantId,
          terminalId: input.terminalId,
          actorId: ctx.user.id,
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
    deactivate: verifiedProcedure.input(terminalInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.terminal.deactivate");
      try {
        return await getPosTerminalService().deactivate({
          restaurantId: input.restaurantId,
          terminalId: input.terminalId,
          actorId: ctx.user.id,
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
    replace: verifiedProcedure.input(terminalInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.terminal.replace");
      try {
        return await getPosTerminalService().replace({
          restaurantId: input.restaurantId,
          terminalId: input.terminalId,
          actorId: ctx.user.id,
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
  }),
  access: router({
    resolve: verifiedProcedure
      .input(
        terminalInput.extend({
          requiredPermission: z.enum(POS_PERMISSIONS).default("POS_ACCESS"),
        })
      )
      .query(async ({ input, ctx }) => {
        const scope = await assertRestaurantPosScope(
          ctx,
          input.restaurantId,
          getPosGrantStore(),
          "pos.access.resolve"
        );
        try {
          return await getPosAccessService().resolvePosTerminalAccess({
            restaurantId: input.restaurantId,
            terminalId: input.terminalId,
            userId: ctx.user.id,
            requiredPermission: input.requiredPermission,
            restaurantScope: scope.kind,
          });
        } catch (err) {
          mapPosError(err);
        }
      }),
    context: verifiedProcedure.input(terminalInput).query(async ({ input, ctx }) => {
      const scope = await assertRestaurantPosScope(
        ctx,
        input.restaurantId,
        getPosGrantStore(),
        "pos.access.context"
      );
      try {
        return await getPosAccessService().resolvePosTerminalAccess({
          restaurantId: input.restaurantId,
          terminalId: input.terminalId,
          userId: ctx.user.id,
          requiredPermission: "POS_ACCESS",
          restaurantScope: scope.kind,
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
    authorize: verifiedProcedure
      .input(
        terminalInput.extend({
          permission: z.enum(POS_PERMISSIONS),
        })
      )
      .query(async ({ input, ctx }) => {
        const scope = await assertRestaurantPosScope(
          ctx,
          input.restaurantId,
          getPosGrantStore(),
          "pos.access.authorize"
        );
        try {
          return await getPosAccessService().resolvePosTerminalAccess({
            restaurantId: input.restaurantId,
            terminalId: input.terminalId,
            userId: ctx.user.id,
            requiredPermission: input.permission,
            restaurantScope: scope.kind,
          });
        } catch (err) {
          mapPosError(err);
        }
      }),
    grant: verifiedProcedure.input(grantInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.access.grant");
      return getPosAccessService().grant({
        restaurantId: input.restaurantId,
        userId: input.userId,
        permission: input.permission,
        actorId: ctx.user.id,
      });
    }),
    revoke: verifiedProcedure.input(grantInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "pos.access.revoke");
      return getPosAccessService().revoke({
        restaurantId: input.restaurantId,
        userId: input.userId,
        permission: input.permission,
        actorId: ctx.user.id,
      });
    }),
  }),
  sale: router({
    create: verifiedProcedure.input(saleCreateInput).mutation(async ({ input, ctx }) => {
      try {
        return await getPosSaleService().create({
          user: ctx.user,
          command: {
            restaurantId: input.restaurantId,
            terminalId: input.terminalId,
            items: input.items,
            notes: input.notes,
            sessionId: input.sessionId,
            idempotencyKey: input.idempotencyKey,
          },
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
  }),
  check: router({
    intake: verifiedProcedure.input(checkIntakeInput).mutation(async ({ input, ctx }) => {
      try {
        return await getPosCheckIntakeService().intake({
          user: ctx.user,
          command: {
            restaurantId: input.restaurantId,
            terminalId: input.terminalId,
            orderId: input.orderId,
            idempotencyKey: input.idempotencyKey,
          },
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
  }),
  settlement: router({
    initiate: verifiedProcedure
      .input(settlementInitiateInput)
      .mutation(async ({ input, ctx }) => {
        try {
          return await getPosSettlementInitiateService().initiate({
            user: ctx.user,
            command: {
              restaurantId: input.restaurantId,
              terminalId: input.terminalId,
              orderId: input.orderId,
              idempotencyKey: input.idempotencyKey,
            },
          });
        } catch (err) {
          mapPosError(err);
        }
      }),
  }),
});
