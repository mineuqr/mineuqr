/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Owner-only access-mode APIs. Authorization is server-side ENV.ownerOpenId.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { assertPlatformOwner } from "./identity";
import { presentOwnerAccessMode } from "./presentation";
import { loadOwnerAccessMode, persistOwnerAccessMode } from "./service";

const setModeInput = z.object({
  mode: z.enum(["FULL_PLATFORM", "SIMULATED_PLAN"]),
  simulatedPlanCode: z.string().trim().min(1).max(64).optional(),
});

const setSimulationInput = z.object({
  planCode: z.string().trim().min(1).max(64),
});

function mapPersistError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Owner access update failed";
  if (message.startsWith("SIMULATION_UNAVAILABLE:")) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message,
    });
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

export const ownerAccessRouter = router({
  getMode: protectedProcedure.query(async ({ ctx }) => {
    assertPlatformOwner(ctx, "ownerAccess.getMode");
    return presentOwnerAccessMode(ctx.user.openId);
  }),

  setMode: protectedProcedure
    .input(setModeInput)
    .mutation(async ({ ctx, input }) => {
      assertPlatformOwner(ctx, "ownerAccess.setMode");
      const previous = await loadOwnerAccessMode(ctx.user.openId);
      try {
        await persistOwnerAccessMode({
          ownerOpenId: ctx.user.openId,
          ownerUserId: ctx.user.id,
          mode: input.mode,
          simulatedPlanCode:
            input.mode === "FULL_PLATFORM" ? null : input.simulatedPlanCode ?? null,
          previous,
          correlationId: ctx.correlationId,
          procedure: "ownerAccess.setMode",
        });
      } catch (error) {
        mapPersistError(error);
      }
      return presentOwnerAccessMode(ctx.user.openId);
    }),

  setSimulation: protectedProcedure
    .input(setSimulationInput)
    .mutation(async ({ ctx, input }) => {
      assertPlatformOwner(ctx, "ownerAccess.setSimulation");
      const previous = await loadOwnerAccessMode(ctx.user.openId);
      try {
        await persistOwnerAccessMode({
          ownerOpenId: ctx.user.openId,
          ownerUserId: ctx.user.id,
          mode: "SIMULATED_PLAN",
          simulatedPlanCode: input.planCode,
          previous,
          correlationId: ctx.correlationId,
          procedure: "ownerAccess.setSimulation",
        });
      } catch (error) {
        mapPersistError(error);
      }
      return presentOwnerAccessMode(ctx.user.openId);
    }),

  returnToFullPlatform: protectedProcedure.mutation(async ({ ctx }) => {
    assertPlatformOwner(ctx, "ownerAccess.returnToFullPlatform");
    const previous = await loadOwnerAccessMode(ctx.user.openId);
    try {
      await persistOwnerAccessMode({
        ownerOpenId: ctx.user.openId,
        ownerUserId: ctx.user.id,
        mode: "FULL_PLATFORM",
        simulatedPlanCode: null,
        previous,
        correlationId: ctx.correlationId,
        procedure: "ownerAccess.returnToFullPlatform",
      });
    } catch (error) {
      mapPersistError(error);
    }
    return presentOwnerAccessMode(ctx.user.openId);
  }),
});
