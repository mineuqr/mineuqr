/**
 * CRMP-OPERATIONS-API-1 — canonical tRPC exposure for Register Operations.
 *
 * Authorization + validation + DTO serialization only.
 * Orchestrates RegisterDomainService / FinancialShiftDomainService.
 * No Domain rules, Persistence access, or financial calculations.
 */

import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { getCrmpRegisterOperationsService } from "./crmpApiComposition";
import { runCrmpRead, runCrmpWrite } from "./mapCrmpApiError";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const registerIdentityInput = restaurantInput.extend({
  registerId: z.string().min(1).max(128),
});

const concurrencyInput = z.object({
  expectedVersion: z.coerce.number().int().positive().optional(),
  at: z.string().min(1).max(64).optional(),
});

const openRegisterInput = registerIdentityInput.merge(concurrencyInput).extend({
  operatorUserId: z.coerce.number().int().positive().nullish(),
});

const operatorInput = registerIdentityInput.merge(concurrencyInput).extend({
  operatorUserId: z.coerce.number().int().positive(),
});

const deviceInput = registerIdentityInput.merge(concurrencyInput).extend({
  deviceId: z.string().min(1).max(64),
});

const resolveActiveInput = restaurantInput.extend({
  registerId: z.string().min(1).max(128).nullish(),
  requireDutyOpen: z.boolean().optional(),
});

const resolveByDeviceInput = restaurantInput.extend({
  deviceId: z.string().min(1).max(64),
});

const resolveByOperatorInput = restaurantInput.extend({
  operatorUserId: z.coerce.number().int().positive(),
});

/**
 * Canonical CRMP Register Operations API (`crmp.register.*`).
 */
export const crmpRouter = router({
  register: router({
    // ─── Commands ────────────────────────────────────────────────────

    open: verifiedProcedure
      .input(openRegisterInput)
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(ctx, input.restaurantId, "crmp.register.open");
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.open({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            operatorUserId: input.operatorUserId ?? null,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    close: verifiedProcedure
      .input(registerIdentityInput.merge(concurrencyInput))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(ctx, input.restaurantId, "crmp.register.close");
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.close({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    suspend: verifiedProcedure
      .input(registerIdentityInput.merge(concurrencyInput))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.suspend"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.suspend({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    resume: verifiedProcedure
      .input(registerIdentityInput.merge(concurrencyInput))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(ctx, input.restaurantId, "crmp.register.resume");
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.resume({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    assignOperator: verifiedProcedure
      .input(operatorInput)
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.assignOperator"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.assignOperator({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            operatorUserId: input.operatorUserId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    releaseOperator: verifiedProcedure
      .input(registerIdentityInput.merge(concurrencyInput))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.releaseOperator"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.releaseOperator({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    reassignOperator: verifiedProcedure
      .input(operatorInput)
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.reassignOperator"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.reassignOperator({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            operatorUserId: input.operatorUserId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    attachDevice: verifiedProcedure
      .input(deviceInput)
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.attachDevice"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.attachDevice({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            deviceId: input.deviceId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    detachDevice: verifiedProcedure
      .input(registerIdentityInput.merge(concurrencyInput))
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.detachDevice"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.detachDevice({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    replaceDevice: verifiedProcedure
      .input(deviceInput)
      .mutation(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.replaceDevice"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpWrite(() =>
          svc.replaceDevice({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            deviceId: input.deviceId,
            expectedVersion: input.expectedVersion,
            at: input.at,
          })
        );
      }),

    // ─── Queries ─────────────────────────────────────────────────────

    get: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(ctx, input.restaurantId, "crmp.register.get");
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.get(input));
      }),

    getCurrent: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getCurrent"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.getCurrentView(input));
      }),

    getDutyStatus: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getDutyStatus"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(async () => {
          const register = await svc.get(input);
          return {
            registerId: register.registerId,
            dutyStatus: register.dutyStatus,
            catalogStatus: register.catalogStatus,
            version: register.version,
          };
        });
      }),

    getCurrentOperator: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getCurrentOperator"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(async () => {
          const register = await svc.get(input);
          return {
            registerId: register.registerId,
            assignedOperatorUserId: register.assignedOperatorUserId,
            operatorAssignedAt: register.operatorAssignedAt,
            dutyStatus: register.dutyStatus,
          };
        });
      }),

    getCurrentDevice: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getCurrentDevice"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(async () => {
          const register = await svc.get(input);
          return {
            registerId: register.registerId,
            deviceId: register.deviceId,
          };
        });
      }),

    getCurrentFinancialShift: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getCurrentFinancialShift"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.getCurrentFinancialShift(input));
      }),

    listAvailable: verifiedProcedure
      .input(restaurantInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.listAvailable"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.listAvailable(input));
      }),

    getHistory: verifiedProcedure
      .input(registerIdentityInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.getHistory"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.getHistory(input));
      }),

    resolveActive: verifiedProcedure
      .input(resolveActiveInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.resolveActive"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() =>
          svc.resolveActive({
            restaurantId: input.restaurantId,
            registerId: input.registerId,
            requireDutyOpen: input.requireDutyOpen,
          })
        );
      }),

    resolveByDevice: verifiedProcedure
      .input(resolveByDeviceInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.resolveByDevice"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.resolveByDevice(input));
      }),

    resolveByOperator: verifiedProcedure
      .input(resolveByOperatorInput)
      .query(async ({ input, ctx }) => {
        await assertRestaurantAccess(
          ctx,
          input.restaurantId,
          "crmp.register.resolveByOperator"
        );
        const svc = getCrmpRegisterOperationsService();
        return runCrmpRead(() => svc.resolveByOperator(input));
      }),
  }),
});
