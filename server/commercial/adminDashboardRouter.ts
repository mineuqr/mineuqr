import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertAdminAccess } from "../_core/assertAdminAccess";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllUsers,
  getDb,
  getExtendedAdminStats,
  sanitizeUserForAdminResponse,
} from "../db";
import { restaurants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { commercialReadService } from "./CommercialReadService";
import { canonicalMetricsService } from "./metrics/CanonicalMetricsService";
import type { OwnerCommercialState } from "./commercialReadSlices";

export type AdminOwnerOverview = {
  owner: {
    id: number;
    name: string | null;
    email: string | null;
    role: "user" | "admin";
    createdAt: Date;
  };
  commercial: OwnerCommercialState;
};

export type AdminRestaurantListItem = {
  restaurant: {
    id: number;
    userId: number;
    nameAr: string;
    nameEn: string | null;
    slug: string;
    isActive: boolean;
    phone: string | null;
    createdAt: Date;
  };
  ownerCommercial: Pick<
    OwnerCommercialState,
    "planCode" | "subscriptionStatus" | "commercialStatus" | "trialStatus"
  >;
};

/**
 * EXEC-3 / AR-4 Category B — dashboard read APIs (CRS-only commercial fields).
 */
export const adminDashboardReadRouter = router({
  getOwnerOverview: protectedProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.getOwnerOverview");
      const users = await getAllUsers();
      const user = users.find((u) => u.id === input.ownerId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const commercial = await commercialReadService.getOwnerCommercialState(
        input.ownerId
      );
      const safe = sanitizeUserForAdminResponse(user);
      return {
        owner: {
          id: safe.id,
          name: safe.name,
          email: safe.email,
          role: safe.role,
          createdAt: safe.createdAt,
        },
        commercial,
      } satisfies AdminOwnerOverview;
    }),

  getOwnerOverviewList: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          roleFilter: z.enum(["user", "admin"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.getOwnerOverviewList");
      const limit = input?.limit ?? 100;
      let users = await getAllUsers();
      if (input?.roleFilter) {
        users = users.filter((u) => u.role === input.roleFilter);
      }
      const sliced = users.slice(0, limit);
      const commercials = await commercialReadService.getOwnerCommercialStates(
        sliced.map((u) => u.id)
      );
      const commercialByOwner = new Map(
        commercials.map((c) => [c.ownerId, c] as const)
      );
      const items: AdminOwnerOverview[] = sliced.map((user) => {
        const safe = sanitizeUserForAdminResponse(user);
        return {
          owner: {
            id: safe.id,
            name: safe.name,
            email: safe.email,
            role: safe.role,
            createdAt: safe.createdAt,
          },
          commercial: commercialByOwner.get(safe.id)!,
        };
      });
      return { items, nextCursor: users.length > limit ? String(limit) : undefined };
    }),

  getSubscriptionOverview: protectedProcedure
    .input(
      z
        .object({
          statusFilter: z.enum(["trial", "active", "canceled", "expired"]).optional(),
          planFilter: z
            .enum(["NONE", "TRIAL", "BASIC", "PROFESSIONAL", "ENTERPRISE", "ADMIN"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.getSubscriptionOverview");
      let owners = await commercialReadService.getAllOwnerCommercialStates();
      if (input?.statusFilter) {
        owners = owners.filter((o) => o.subscriptionStatus === input.statusFilter);
      }
      if (input?.planFilter) {
        owners = owners.filter((o) => o.planCode === input.planFilter);
      }
      owners.sort((a, b) => a.ownerId - b.ownerId);
      return { owners };
    }),

  getDashboardSummary: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.getDashboardSummary");
      const now = input?.now ? new Date(input.now) : new Date();
      const extended = await getExtendedAdminStats();
      const db = await getDb();
      const activeRestaurants = db
        ? (
            await db
              .select({ id: restaurants.id })
              .from(restaurants)
              .where(eq(restaurants.isActive, true))
          ).length
        : 0;

      return canonicalMetricsService.getDashboardSummary(
        {
          totalUsers: extended?.totalUsers ?? 0,
          totalRestaurants: extended?.totalRestaurants ?? 0,
          activeRestaurants,
        },
        now
      );
    }),

  listRestaurants: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "admin.listRestaurants");
    const db = await getDb();
    if (!db) return { items: [] as AdminRestaurantListItem[] };

    const rows = await db.select().from(restaurants);
    const ownerIds = [...new Set(rows.map((r) => r.userId))];
    const commercials = await commercialReadService.getOwnerCommercialStates(ownerIds);
    const commercialByOwner = new Map(commercials.map((c) => [c.ownerId, c] as const));

    const items: AdminRestaurantListItem[] = rows.map((restaurant) => {
      const commercial = commercialByOwner.get(restaurant.userId);
      const ownerCommercial = commercial
        ? {
            planCode: commercial.planCode,
            subscriptionStatus: commercial.subscriptionStatus,
            commercialStatus: commercial.commercialStatus,
            trialStatus: commercial.trialStatus,
          }
        : {
            planCode: "NONE" as const,
            subscriptionStatus: null,
            commercialStatus: {
              accountType: "NONE" as const,
              isPaid: false,
              isEntitled: false,
              countsInMrr: false,
              countsInRevenue: false,
              invoiceEligible: false,
            },
            trialStatus: {
              isTrial: false,
              trialEndsAt: null,
              daysRemaining: null,
            },
          };

      return {
        restaurant: {
          id: restaurant.id,
          userId: restaurant.userId,
          nameAr: restaurant.nameAr,
          nameEn: restaurant.nameEn,
          slug: restaurant.slug,
          isActive: restaurant.isActive,
          phone: restaurant.phone,
          createdAt: restaurant.createdAt,
        },
        ownerCommercial,
      };
    });

    return { items };
  }),
});
