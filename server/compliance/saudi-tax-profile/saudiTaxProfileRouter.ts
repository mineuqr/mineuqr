/**
 * SAUDI-TAX-PROFILE-1
 * tRPC boundary for Saudi Tax Profile — owner/admin via assertRestaurantAccess.
 * Not Cashier. Not Tax Invoice. No commercial entitlement jurisdiction gating.
 */

import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import {
  getSaudiTaxProfileView,
  upsertSaudiTaxProfile,
} from "./SaudiTaxProfileService";

const vatStatusSchema = z.enum([
  "unknown",
  "not_registered",
  "registered",
]);

export const saudiTaxProfileRouter = router({
  get: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "saudiTaxProfile.get"
      );
      return getSaudiTaxProfileView(input.restaurantId);
    }),

  upsert: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        legalName: z.string().min(1).max(255),
        vatRegistrationStatus: vatStatusSchema,
        vatNumber: z.string().max(32).nullable().optional(),
        registeredAddress: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "saudiTaxProfile.upsert"
      );
      return upsertSaudiTaxProfile(
        {
          restaurantId: input.restaurantId,
          legalName: input.legalName,
          vatRegistrationStatus: input.vatRegistrationStatus,
          vatNumber: input.vatNumber,
          registeredAddress: input.registeredAddress,
        },
        { userId: ctx.user.id, role: ctx.user.role ?? null }
      );
    }),
});
