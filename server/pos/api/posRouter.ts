/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1
 * POS-SALE-ORDER-IMPLEMENTATION-1
 * POS-CHECK-INTAKE-IMPLEMENTATION-1
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1
 * POS-REGISTER-SHIFT-IMPLEMENTATION-1
 * POS-CASHIER-CRMP-OPERATIONS-1
 * POS-CASHIER-DRAWER-MOVEMENT-1
 * Thin POS router. Cashier Register/Shift/Drawer Movement commands orchestrate
 * through CRMP façades. POS-READ-APIS-IMPLEMENTATION-1 mounts `read` as a
 * terminal-authorized façade over canonical Order Read / Order Settlement /
 * Menu rows. No POS Register/Shift/cash persistence. Drawer Movement
 * remains CRMP-owned; POS only authorizes and forwards.
 */

import { posReadRouter } from "./posReadRouter";
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
  getPosRegisterShiftContextService,
  getPosCashierCrmpOperationsService,
  getPosTerminalService,
} from "../posComposition";
import { PosCheckIntakeError } from "../services/PosCheckIntakeService";
import { PosEntitlementDeniedError } from "../services/PosEntitlementService";
import { PosSaleError } from "../services/PosSaleService";
import { PosSettlementInitiateError } from "../services/PosSettlementInitiateService";
import { PosRegisterShiftContextError } from "../services/PosRegisterShiftContextService";
import { PosCashierCrmpError } from "../services/PosCashierCrmpOperationsService";
import { PosTerminalError } from "../services/PosTerminalService";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
  throwCommercialOccupancyTrpcError,
} from "../../subscription-runtime";

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

const moneyAmountInput = z
  .string()
  .min(1)
  .max(32)
  .regex(/^\d+(\.\d{1,2})?$/, "invalid decimal amount");

const checkIntakeInput = terminalInput.extend({
  orderId: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(128),
  billDiscountAmount: moneyAmountInput.optional(),
});

const settlementLineInput = z.object({
  paymentMethod: z.enum(["cash", "card"]),
  /** Optional; required by Check when more than one line is supplied. */
  amount: moneyAmountInput.optional(),
});

const settlementInitiateInput = terminalInput
  .extend({
    orderId: z.number().int().positive().optional(),
    items: z.array(saleItemInput).min(1).max(100).optional(),
    idempotencyKey: z.string().min(8).max(128),
    paymentIntentId: z.string().min(8).max(128),
    /** Catalog keys from SELECTABLE_PAYMENT_METHODS. Amounts stay Check-owned. */
    paymentMethod: z.enum(["cash", "card"]).optional(),
    settlements: z.array(settlementLineInput).min(1).max(8).optional(),
    /** Discount intent. Server calculates authoritative discount at Confirm. */
    billDiscountAmount: moneyAmountInput.optional(),
    complimentary: z.boolean().optional(),
  })
  .refine((value) => (value.items?.length ?? 0) > 0 || value.orderId != null, {
    message: "Prepared invoice items are required",
  });

const cashierRegisterInput = terminalInput.extend({
  registerId: z.string().min(1).max(128),
});

const cashierShiftOpenInput = cashierRegisterInput.extend({
  openingFloatAmount: moneyAmountInput,
  currencyCode: z.string().min(1).max(8),
  idempotencyKey: z.string().min(8).max(128),
});

const cashierShiftCloseInput = cashierRegisterInput.extend({
  actualCashAmount: moneyAmountInput,
  financialShiftId: z.string().min(1).max(128).optional(),
});

const cashierDrawerAmountInput = z
  .string()
  .min(1)
  .max(32)
  .regex(/^-?\d+(\.\d{1,2})?$/, "invalid decimal amount");

const cashierDrawerMovementInput = cashierRegisterInput.extend({
  movementType: z.enum(["paid_in", "paid_out", "safe_drop", "manual_adjustment"]),
  amount: cashierDrawerAmountInput,
  reason: z.string().min(1).max(512),
  idempotencyKey: z.string().min(8).max(128),
  currencyCode: z.string().min(1).max(8).optional(),
  financialShiftId: z.string().min(1).max(128).optional(),
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
  "register_wrong_restaurant",
  "register_terminal_mismatch",
]);

function mapPosError(err: unknown): never {
  if (
    err instanceof CommercialLimitExceededError ||
    err instanceof CommercialOccupancyUnavailableError
  ) {
    throwCommercialOccupancyTrpcError(err, (cap) => {
      const word = cap === 1 ? "نقطة بيع" : "نقاط بيع";
      return `خطتك الحالية تسمح بحد أقصى ${cap} ${word}.`;
    });
  }
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
  if (err instanceof PosRegisterShiftContextError) {
    throw new TRPCError({
      code: err.code === "register_wrong_restaurant" ? "FORBIDDEN" : "BAD_REQUEST",
      message: err.code === "register_wrong_restaurant" ? "غير مصرح بالوصول" : err.message,
    });
  }
  if (err instanceof PosCashierCrmpError) {
    if (
      err.code === "idempotency_conflict" ||
      err.code === "concurrency_conflict" ||
      err.code === "drawer_overdraft" ||
      err.code === "shift_closed"
    ) {
      throw new TRPCError({ code: "CONFLICT", message: err.message });
    }
    if (SALE_FORBIDDEN_CODES.has(err.code)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (
    err instanceof PosSaleError ||
    err instanceof PosCheckIntakeError ||
    err instanceof PosSettlementInitiateError
  ) {
    // posCode is not a TRPCError constructor field in this tRPC version.
    // Client classification uses HTTP code + message (e.g. already terminal).
    if (err.code === "idempotency_conflict" || err.code === "concurrency_conflict") {
      throw new TRPCError({ code: "CONFLICT", message: err.message, cause: err });
    }
    if (SALE_FORBIDDEN_CODES.has(err.code)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "غير مصرح بالوصول",
        cause: err,
      });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message, cause: err });
  }
  throw err;
}

export const posRouter = router({
  read: posReadRouter,
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
            billDiscountAmount: input.billDiscountAmount,
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
          const result = await getPosSettlementInitiateService().initiate({
            user: ctx.user,
            command: {
              restaurantId: input.restaurantId,
              terminalId: input.terminalId,
              orderId: input.orderId,
              items: input.items,
              idempotencyKey: input.idempotencyKey,
              paymentIntentId: input.paymentIntentId,
              paymentMethod: input.paymentMethod,
              settlements: input.settlements,
              billDiscountAmount: input.billDiscountAmount,
              complimentary: input.complimentary,
            },
          });
          const { schedulePostConfirmOperationalRecovery } = await import(
            "../../order/postConfirmOperationalRecovery"
          );
          schedulePostConfirmOperationalRecovery();
          return result;
        } catch (err) {
          mapPosError(err);
        }
      }),
  }),
  registerShift: router({
    context: verifiedProcedure.input(terminalInput).query(async ({ input, ctx }) => {
      const scope = await assertRestaurantPosScope(
        ctx,
        input.restaurantId,
        getPosGrantStore(),
        "pos.registerShift.context"
      );
      try {
        const decision = await getPosAccessService().resolvePosTerminalAccess({
          restaurantId: input.restaurantId,
          terminalId: input.terminalId,
          userId: ctx.user.id,
          requiredPermission: "POS_ACCESS",
          restaurantScope: scope.kind,
        });
        if (!decision.allowed || !decision.context) {
          throw new PosSettlementInitiateError(
            decision.reasonCode || "pos_permission_denied",
            "غير مصرح بالوصول"
          );
        }
        return await getPosRegisterShiftContextService().resolveForTerminal({
          restaurantId: decision.context.restaurantId,
          terminalId: decision.context.terminalId,
          operatorUserId: decision.context.userId,
        });
      } catch (err) {
        mapPosError(err);
      }
    }),
  }),
  cashier: router({
    register: router({
      open: verifiedProcedure
        .input(cashierRegisterInput)
        .mutation(async ({ input, ctx }) => {
          try {
            return await getPosCashierCrmpOperationsService().openRegister({
              user: ctx.user,
              command: {
                restaurantId: input.restaurantId,
                terminalId: input.terminalId,
                registerId: input.registerId,
              },
            });
          } catch (err) {
            mapPosError(err);
          }
        }),
      close: verifiedProcedure
        .input(cashierRegisterInput)
        .mutation(async ({ input, ctx }) => {
          try {
            return await getPosCashierCrmpOperationsService().closeRegister({
              user: ctx.user,
              command: {
                restaurantId: input.restaurantId,
                terminalId: input.terminalId,
                registerId: input.registerId,
              },
            });
          } catch (err) {
            mapPosError(err);
          }
        }),
    }),
    financialShift: router({
      open: verifiedProcedure
        .input(cashierShiftOpenInput)
        .mutation(async ({ input, ctx }) => {
          try {
            return await getPosCashierCrmpOperationsService().openShift({
              user: ctx.user,
              command: {
                restaurantId: input.restaurantId,
                terminalId: input.terminalId,
                registerId: input.registerId,
                openingFloatAmount: input.openingFloatAmount,
                currencyCode: input.currencyCode,
                idempotencyKey: input.idempotencyKey,
              },
            });
          } catch (err) {
            mapPosError(err);
          }
        }),
      close: verifiedProcedure
        .input(cashierShiftCloseInput)
        .mutation(async ({ input, ctx }) => {
          try {
            return await getPosCashierCrmpOperationsService().closeShift({
              user: ctx.user,
              command: {
                restaurantId: input.restaurantId,
                terminalId: input.terminalId,
                registerId: input.registerId,
                actualCashAmount: input.actualCashAmount,
                financialShiftId: input.financialShiftId,
              },
            });
          } catch (err) {
            mapPosError(err);
          }
        }),
      recordDrawerMovement: verifiedProcedure
        .input(cashierDrawerMovementInput)
        .mutation(async ({ input, ctx }) => {
          try {
            return await getPosCashierCrmpOperationsService().recordDrawerMovement({
              user: ctx.user,
              command: {
                restaurantId: input.restaurantId,
                terminalId: input.terminalId,
                registerId: input.registerId,
                movementType: input.movementType,
                amount: input.amount,
                reason: input.reason,
                idempotencyKey: input.idempotencyKey,
                currencyCode: input.currencyCode,
                financialShiftId: input.financialShiftId,
              },
            });
          } catch (err) {
            mapPosError(err);
          }
        }),
    }),
  }),
});
