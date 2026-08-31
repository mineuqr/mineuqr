/**
 * CUSTOMER-FOUNDATION-1
 * tRPC Customer boundary — owner/admin via assertRestaurantAccess.
 * Cashier POS grants do not authorize Customer Management mutation.
 */

import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { assertRestaurantPosScope } from "../pos/authorization/assertRestaurantPosScope";
import { getPosGrantStore } from "../pos/posComposition";
import {
  createCustomer,
  getCustomer,
  searchCustomers,
  updateCustomer,
} from "./CustomerService";

const customerTypeSchema = z.enum(["individual", "business"]);
const customerStatusSchema = z.enum(["active", "archived"]);

export const customerRouter = router({
  list: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        customerType: customerTypeSchema.optional(),
        status: customerStatusSchema.optional(),
        query: z.string().max(255).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "customer.list");
      return searchCustomers(input);
    }),

  search: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        query: z.string().max(255).optional(),
        customerType: customerTypeSchema.optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "customer.search");
      return searchCustomers({
        restaurantId: input.restaurantId,
        query: input.query,
        customerType: input.customerType,
        status: "active",
        limit: input.limit ?? 25,
      });
    }),

  /**
   * Cashier select/search — POS scope (owner/admin/pos_grant).
   * Read-only. Mutations remain on assertRestaurantAccess.
   */
  searchForPos: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        query: z.string().max(255).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantPosScope(
        ctx,
        input.restaurantId,
        getPosGrantStore(),
        "customer.searchForPos"
      );
      return searchCustomers({
        restaurantId: input.restaurantId,
        query: input.query,
        status: "active",
        limit: input.limit ?? 25,
      });
    }),

  get: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "customer.get");
      return getCustomer(input);
    }),

  create: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        displayName: z.string().min(1).max(255),
        customerType: customerTypeSchema,
        phone: z.string().max(32).nullable().optional(),
        email: z.string().max(320).nullable().optional(),
        address: z.string().max(2000).nullable().optional(),
        taxNumber: z.string().max(64).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "customer.create");
      return createCustomer(input, {
        userId: ctx.user.id,
        role: ctx.user.role ?? null,
      });
    }),

  update: verifiedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        restaurantId: z.number().int().positive(),
        displayName: z.string().min(1).max(255).optional(),
        customerType: customerTypeSchema.optional(),
        phone: z.string().max(32).nullable().optional(),
        email: z.string().max(320).nullable().optional(),
        address: z.string().max(2000).nullable().optional(),
        taxNumber: z.string().max(64).nullable().optional(),
        status: customerStatusSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "customer.update");
      return updateCustomer(input, {
        userId: ctx.user.id,
        role: ctx.user.role ?? null,
      });
    }),
});
