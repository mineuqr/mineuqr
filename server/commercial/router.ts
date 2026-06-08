import { z } from "zod";
import { assertAdminAccess } from "../_core/assertAdminAccess";
import { protectedProcedure, router, verifiedProcedure } from "../_core/trpc";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { commercialReadService } from "./CommercialReadService";
import {
  toEntitlementsSlice,
  toPlanSlice,
  toSubscriptionSlice,
  toTrialSlice,
} from "./commercialReadSlices";

/**
 * Read-only commercial observation procedures (PG-1C.2E + EXEC-3 Category A).
 * Legacy getEntitlements shape preserved for existing consumers.
 */
export const commercialRouter = router({
  /** Diagnostic: canonical CommercialContext + resolver entitlements for the authenticated owner. */
  getEntitlements: verifiedProcedure.query(async ({ ctx }) => {
    return getCommercialEntitlements(ctx.user.id);
  }),

  getOwnerCommercialState: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerCommercialState");
      return commercialReadService.getOwnerCommercialState(input.ownerId);
    }),

  getOwnerCommercialStates: protectedProcedure
    .input(z.object({ ownerIds: z.array(z.number()).min(1).max(500) }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerCommercialStates");
      return commercialReadService.getOwnerCommercialStates(input.ownerIds);
    }),

  getOwnerPlan: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerPlan");
      const authority = await commercialReadService.getOwnerCommercialState(
        input.ownerId
      );
      return toPlanSlice(authority);
    }),

  getOwnerEntitlements: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerEntitlements");
      const authority = await commercialReadService.getOwnerCommercialState(
        input.ownerId
      );
      return toEntitlementsSlice(authority);
    }),

  getOwnerTrialStatus: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerTrialStatus");
      const authority = await commercialReadService.getOwnerCommercialState(
        input.ownerId
      );
      return toTrialSlice(authority);
    }),

  getOwnerSubscription: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercial.getOwnerSubscription");
      const authority = await commercialReadService.getOwnerCommercialState(
        input.ownerId
      );
      return toSubscriptionSlice(authority);
    }),
});
