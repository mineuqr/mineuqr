import { clearSessionCookie } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, verifiedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getRestaurantsByUser, getRestaurantById, getRestaurantBySlug,
  createRestaurant, updateRestaurant, incrementViewCount,
  getCategoriesByRestaurant, getCategoryById, createCategory, updateCategory, deleteCategory,
  getMenuItemsByCategory, getMenuItemsByRestaurant, getMenuItemById,
  createMenuItem, updateMenuItem, deleteMenuItem, getRestaurantStats,
  getSubscriptionPlans, getSubscriptionPlanById, createUserSubscription, getCanonicalUserSubscription,
  isSubscriptionActive,
  getOffersByRestaurant, getActiveOffersByRestaurant, getOfferById, createOffer, updateOffer, deleteOffer,
  getInvoicesByUser, getInvoiceById, getUnpaidInvoices,
  getNotificationsByUser, getUnreadNotifications, markNotificationAsRead, createNotification,
  getCurrencyByCountryCode, getAllCountriesCurrencies,
  upsertUser, getUserByEmail, updateUserPassword, updateUserProfile,
  cancelSubscriptionById, getSubscriptionForRestaurant,
  getAdminStatistics, getRevenueByMonth,
  getPublicStats, getExtendedAdminStats,
  getAllUsers, updateAccountClassification,
  sanitizeUserForAdminResponse,
  createInvoice, updateInvoice, getUserById,
  updateUserSessionValidAfter,
  getHolidaysByRestaurant, createHoliday, updateHoliday, deleteHoliday, getHolidayById,
  getTablesByRestaurant, getTableById, getTableByRestaurantAndNumber, createTable, updateTable, deleteTable, createMultipleTables,
  getOrdersByRestaurant, getOrdersWithItemsByRestaurant, getOrderById, getOrderByTrackingToken, getOrderItemsByOrderId, getActiveOrdersCount,
} from "./db";
import { canChangeOwnPassword } from "./auth-local/httpHelpers";
import { sendVerificationEmailForUser } from "./auth-local/sendVerificationEmail";
import {
  accountEmailChanged,
  normalizeAccountEmailOrNull,
} from "./_core/normalizeAccountEmail";
import { assertRestaurantAccess } from "./restaurantAccess";
import {
  assertCategoryCreateAllowed,
  assertMenuItemCreateAllowed,
  assertRestaurantCreateAllowed,
} from "./subscriptionPlanLimits";
import { assertAdminAccess, assertNotSelfAdminTarget } from "./_core/assertAdminAccess";
import {
  assertSubscriptionEligibleForAdminInvoice,
  resolveAdminRestaurantOwnerUserId,
} from "./adminSubscriptionHelpers";
import {
  getOwnerAccountSubscriptionRow,
} from "./commercial/ownerAccountSubscriptionAuthority";
import { assertRestaurantScopedSubscriptionRetired } from "./commercial/retiredRestaurantSubscriptionApi";
import {
  ACCOUNT_CLASSIFICATIONS,
  INTERNAL_STAFF_CATEGORIES,
  isForbiddenSystemAdminCombo,
} from "@shared/accountClassification";
import { createInternalUser } from "./createInternalUser";
import {
  logAccountClassificationChanged,
  logInternalUserCreated,
} from "./accountClassificationAudit";
import { applyAdminUserRoleUpdate } from "./roleChangeAudit";
import { applyAdminPasswordReset } from "./passwordResetAudit";
import {
  applyAdminUserSubscriptionCreate,
  applyAdminUserSubscriptionDelete,
  applyAdminUserSubscriptionUpdate,
} from "./subscriptionAudit";
import {
  assertProtectedUserClassificationModifiable,
  assertProtectedUserSubscriptionModifiable,
  deleteRestaurantCascade,
  deleteUserCascade,
  ProtectedUserDeleteError,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";
import { cascadeAuditFromTrpc } from "./db/cascadeAudit";
import { isRestaurantOpen, parseTemporaryClosure } from "./lib/restaurantHours";
import { formatInRestaurantTimezone, todayYmd } from "@shared/utils/timezone";
import { putUploadedFile } from "./local-uploads";
import {
  buildEntityImageMetadata,
  validateEntityImageUpload,
} from "./media/entityImage";
import { notifyOwnerNewRestaurant, notifyOwnerNewSubscription, notifyOwnerSubscriptionCancelled } from "./owner-email-notifications";
import { generateInvoicePDFBuffer } from "./invoice-pdf";
import { mergeRouters } from "./_core/trpc";
import { ENV } from "./_core/env";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { markPaid, markComplimentary, closeSession } from "./diningSession/sessionService";
import { resolveOperationalSession } from "./operational-session";
import { findSessionById } from "./diningSession/sessionRepository";
import { SESSION_TOKEN_PATTERN } from "./diningSession/sessionPublicStatus";
import { throwSessionServiceTrpcError } from "./diningSession/mapSessionErrorToTrpc";
import {
  getPublicActiveSessionByTable,
  getPublicSessionByToken,
} from "./diningSession/sessionRecoveryService";
import { getOwnerSessionTimeline } from "./diningSession/sessionOwnerTimeline";
import { getOwnerSessionWorkspace } from "./diningSession/sessionOwnerWorkspace";
import { opsRouter } from "./ops/opsRouter";
import { kitchenRouter } from "./kitchen/read/kitchenRouter";
import { orderReadRouter } from "./order/read/orderReadRouter";
import { mapOrderDisplayIdentityFields } from "./order/read/presentation/mapOrderDisplayIdentity";
import { printWorkspaceRouter } from "./print-workspace/printWorkspaceRouter";
import { operationalDeviceRouter } from "./operational-device/operationalDeviceRouter";
import { printConnectorRouter } from "./print-connector/printConnectorRouter";
import { printerManagementRouter } from "./printer-management/printerManagementRouter";
import { toPublicOrderStatus } from "./orderPublicStatus";
import { adminAuditRouter } from "./audit/adminAuditRouter";
import { adminDashboardReadRouter } from "./commercial/adminDashboardRouter";
import { analyticsRouter } from "./commercial/analyticsRouter";
import { commercialRouter } from "./commercial/router";
import { resolveGuestOrderingAllowed } from "./commercial/guestOrderingAuthority";
import { orderingRouter } from "./orderingRouter";
import { resolveTrialStatusRead } from "./commercial/wave1ReadAuthority";
import {
  advanceOrderStatusService,
} from "./order/composition";
import { placeOrderService } from "./order/placeOrderComposition";
import { runOrderCommand } from "./order/application/mapOrderDomainError";
import { resolveOrderActorFromUser } from "./order/application/resolveOrderActor";
import { createTableOrderIdentity } from "@shared/ordering-platform/orderingIdentityContract";
import { createTableSessionAnchor } from "@shared/operational-session";
import bcrypt from "bcryptjs";

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${nanoid(6)}`;
}

const restaurantRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRestaurantsByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const restaurant = await getRestaurantById(input.id);
      if (!restaurant) return null;
      // Preserve null-on-deny semantics while routing through tenant audit logging.
      try {
        await assertRestaurantAccess(ctx, input.id, "restaurant.getById");
      } catch {
        return null;
      }
      return restaurant;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return getRestaurantBySlug(input.slug);
    }),

  create: verifiedProcedure
    .input(z.object({
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      ownerEmail: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      countryCode: z.string().optional(),
      currencyCode: z.string().optional(),
      currencySymbol: z.string().optional(),
      ownerUserId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        await assertRestaurantCreateAllowed(ctx.user.id);
      }
      const ownerUserId =
        ctx.user.role === "admin"
          ? await resolveAdminRestaurantOwnerUserId({
              ownerUserId: input.ownerUserId,
              ownerEmail: input.ownerEmail,
              adminUserId: ctx.user.id,
            })
          : ctx.user.id;
      const ownerUser =
        ownerUserId === ctx.user.id ? ctx.user : await getUserById(ownerUserId);
      const slug = generateSlug(input.nameAr);
      const { ownerUserId: _ownerUserId, ...restaurantInput } = input;
      const result = await createRestaurant({
        ...restaurantInput,
        userId: ownerUserId,
        slug,
      });
      // Send email notification to owner
      try {
        await notifyOwnerNewRestaurant({
          restaurantNameAr: input.nameAr,
          restaurantNameEn: input.nameEn,
          ownerName: ownerUser?.name ?? null,
          ownerEmail: ownerUser?.email ?? input.ownerEmail ?? null,
        });
      } catch (e) { /* email notification failure is non-critical */ }
      return { ...result, slug };
    }),

  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      nameAr: z.string().min(1).optional(),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      ownerEmail: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      logoUrl: z.string().optional(),
      coverUrl: z.string().optional(),
      isActive: z.boolean().optional(),
      countryCode: z.string().optional(),
      currencyCode: z.string().optional(),
      currencySymbol: z.string().optional(),
      whatsapp: z.string().optional().nullable(),
      snapchat: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      xTwitter: z.string().optional().nullable(),
      locationUrl: z.string().optional().nullable(),
      workingHours: z.string().optional().nullable(),
      temporaryClosure: z.string().optional().nullable(),
      tableLabel: z.enum(['tables', 'rooms']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurant = await getRestaurantById(input.id);
      if (!restaurant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
      }
      await assertRestaurantAccess(ctx, input.id, "restaurant.update");
      const { id, ...data } = input;
      await updateRestaurant(id, data);
      return { success: true };
    }),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const restaurant = await getRestaurantById(input.id);
      if (!restaurant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
      }
      await assertRestaurantAccess(ctx, input.id, "restaurant.delete");
      await deleteRestaurantCascade(
        input.id,
        cascadeAuditFromTrpc(ctx, "restaurant.delete", "delete_restaurant")
      );
      return { success: true };
    }),

  stats: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const restaurant = await getRestaurantById(input.id);
      if (!restaurant) return null;
      // Preserve null-on-deny semantics while routing through tenant audit logging.
      try {
        await assertRestaurantAccess(ctx, input.id, "restaurant.stats");
      } catch {
        return null;
      }
      return getRestaurantStats(input.id);
    }),

  trackView: publicProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      const restaurant = await getRestaurantBySlug(input.slug);
      if (restaurant) {
        await incrementViewCount(restaurant.id);
      }
      return { success: true };
    }),

  updateTemplate: verifiedProcedure
    .input(z.object({
      id: z.number(),
      menuTemplate: z.enum(["classic", "elegant", "modern", "dark", "warm", "ocean", "royal", "neon"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // Keep FORBIDDEN behavior; route deny decisions through centralized tenant guard + audit log.
      await assertRestaurantAccess(ctx, input.id, "restaurant.updateTemplate");
      // Check subscription for premium templates
      const premiumTemplates = ["elegant", "modern", "dark", "warm", "ocean", "royal", "neon"];
      if (premiumTemplates.includes(input.menuTemplate)) {
        // Allow admin/owner to use premium templates without subscription
        if (ctx.user.role !== "admin") {
          if (!(await isSubscriptionActive(ctx.user.id))) {
            throw new TRPCError({ code: "FORBIDDEN", message: "هذا القالب متاح فقط للمشتركين في الخطة المدفوعة" });
          }
        }
      }
      // Clear custom colors when changing template to use new template's defaults
      await updateRestaurant(input.id, { menuTemplate: input.menuTemplate, customColors: null });
      return { success: true };
    }),

  updateCustomColors: verifiedProcedure
    .input(z.object({
      id: z.number(),
      customColors: z.object({
        bg1: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        bg2: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        card: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        backgroundPattern: z.string().optional(),
      }).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Keep FORBIDDEN behavior; route deny decisions through centralized tenant guard + audit log.
      await assertRestaurantAccess(ctx, input.id, "restaurant.updateCustomColors");
      // Allow admin/owner to customize colors without subscription
      if (ctx.user.role !== "admin") {
        if (!(await isSubscriptionActive(ctx.user.id))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u064a \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629" });
        }
      }
      await updateRestaurant(input.id, { customColors: input.customColors ? JSON.stringify(input.customColors) : null });
      return { success: true };
    }),

  updateCustomFonts: verifiedProcedure
    .input(z.object({
      id: z.number(),
      customFonts: z.object({
        arabicFont: z.string().optional(),
        englishFont: z.string().optional(),
        headingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        bodyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        priceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        headingSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
        bodySize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
        priceSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
      }).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Keep FORBIDDEN behavior; route deny decisions through centralized tenant guard + audit log.
      await assertRestaurantAccess(ctx, input.id, "restaurant.updateCustomFonts");
      // Allow admin/owner to customize fonts without subscription
      if (ctx.user.role !== "admin") {
        if (!(await isSubscriptionActive(ctx.user.id))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "\u062a\u062e\u0635\u0635 \u0627\u0644\u062e\u0637\u0648\u0637 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u064a \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629" });
        }
      }
      await updateRestaurant(input.id, { customFonts: input.customFonts ? JSON.stringify(input.customFonts) : null });
      return { success: true };
    }),

  uploadImage: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      imageData: z.string(), // base64
      fileName: z.string(),
      contentType: z.string(),
      imageType: z.enum(["logo", "cover"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "restaurant.uploadImage");
      const buffer = Buffer.from(input.imageData, "base64");
      const safeFileName = input.fileName.replace(/[^\w.\-]+/g, "_");
      const folder = input.imageType === "logo" ? "logos" : "covers";
      const key = `${folder}/${input.restaurantId}/${nanoid(8)}-${safeFileName}`;
      const { url } = await putUploadedFile(key, buffer, input.contentType, ctx.req);
      if (input.imageType === "logo") {
        await updateRestaurant(input.restaurantId, { logoUrl: url });
      } else {
        await updateRestaurant(input.restaurantId, { coverUrl: url });
      }
      return { url };
    }),

  deleteImage: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      imageType: z.enum(["logo", "cover"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "restaurant.deleteImage");
      if (input.imageType === "logo") {
        await updateRestaurant(input.restaurantId, { logoUrl: null });
      } else {
        await updateRestaurant(input.restaurantId, { coverUrl: null });
      }
      return { success: true };
    }),
});

const categoryRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Preserve []-on-deny semantics while routing through tenant audit logging.
      try {
        await assertRestaurantAccess(ctx, input.restaurantId, "category.list");
      } catch {
        return [];
      }
      return getCategoriesByRestaurant(input.restaurantId);
    }),

  listPublic: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      return getCategoriesByRestaurant(input.restaurantId);
    }),

  create: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      iconName: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "category.create");
      if (ctx.user.role !== "admin") {
        await assertCategoryCreateAllowed(ctx.user.id, input.restaurantId);
      }
      return createCategory(input);
    }),

  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      nameAr: z.string().min(1).optional(),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      iconName: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const category = await getCategoryById(input.id);
      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الفئة غير موجودة" });
      }
      await assertRestaurantAccess(ctx, category.restaurantId, "category.update");
      const { id, ...data } = input;
      await updateCategory(id, data);
      return { success: true };
    }),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const category = await getCategoryById(input.id);
      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الفئة غير موجودة" });
      }
      await assertRestaurantAccess(ctx, category.restaurantId, "category.delete");
      await deleteCategory(input.id);
      return { success: true };
    }),
});

const menuItemRouter = router({
  listByCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input, ctx }) => {
      const category = await getCategoryById(input.categoryId);
      if (!category) return [];
      await assertRestaurantAccess(ctx, category.restaurantId);
      return getMenuItemsByCategory(input.categoryId);
    }),

  listByRestaurant: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      return getMenuItemsByRestaurant(input.restaurantId);
    }),

  create: verifiedProcedure
    .input(z.object({
      categoryId: z.number(),
      restaurantId: z.number(),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      price: z.string(),
      calories: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "menuItem.create");

      // Relational tenant integrity: prevents cross-tenant category linkage on create.
      const category = await getCategoryById(input.categoryId);
      if (!category || category.restaurantId !== input.restaurantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
      }

      if (ctx.user.role !== "admin") {
        await assertMenuItemCreateAllowed(ctx.user.id, input.restaurantId);
      }

      return createMenuItem(input);
    }),

  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      nameAr: z.string().min(1).optional(),
      nameEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      price: z.string().optional(),
      calories: z.number().optional(),
      isAvailable: z.boolean().optional(),
      sortOrder: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await getMenuItemById(input.id);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الصنف غير موجود" });
      }
      await assertRestaurantAccess(ctx, item.restaurantId, "menuItem.update");

      // Relational tenant integrity: prevents cross-tenant category reassignment on update.
      if (input.categoryId !== undefined) {
        const category = await getCategoryById(input.categoryId);
        if (!category || category.restaurantId !== item.restaurantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
        }
      }

      const { id, ...data } = input;
      await updateMenuItem(id, data);
      return { success: true };
    }),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const item = await getMenuItemById(input.id);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الصنف غير موجود" });
      }
      await assertRestaurantAccess(ctx, item.restaurantId, "menuItem.delete");
      await deleteMenuItem(input.id);
      return { success: true };
    }),

  uploadImage: verifiedProcedure
    .input(z.object({
      itemId: z.number(),
      imageData: z.string(), // base64
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await getMenuItemById(input.itemId);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الصنف غير موجود" });
      }
      await assertRestaurantAccess(ctx, item.restaurantId, "menuItem.uploadImage");
      const buffer = Buffer.from(input.imageData, "base64");
      const safeFileName = input.fileName.replace(/[^\w.\-]+/g, "_");
      const key = `items/${item.restaurantId}/${input.itemId}-${nanoid(8)}-${safeFileName}`;
      const { url } = await putUploadedFile(key, buffer, input.contentType, ctx.req);
      await updateMenuItem(input.itemId, { imageUrl: url });
      return { url };
    }),
});

const offerRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Preserve []-on-deny semantics while routing through tenant audit logging.
      try {
        await assertRestaurantAccess(ctx, input.restaurantId, "offer.list");
      } catch {
        return [];
      }
      return getOffersByRestaurant(input.restaurantId);
    }),

  listActive: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      return getActiveOffersByRestaurant(input.restaurantId);
    }),

  create: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      titleAr: z.string().min(1),
      titleEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      offerType: z.enum(["daily", "weekly", "monthly"]),
      originalPrice: z.string(),
      offerPrice: z.string(),
      imageUrl: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "offer.create");
      return createOffer({
        ...input,
        startDate: new Date(input.startDate).toISOString(),
        endDate: new Date(input.endDate).toISOString(),
      });
    }),

  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      titleAr: z.string().min(1).optional(),
      titleEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      offerType: z.enum(["daily", "weekly", "monthly"]).optional(),
      originalPrice: z.string().optional(),
      offerPrice: z.string().optional(),
      imageUrl: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const offer = await getOfferById(input.id);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      }
      await assertRestaurantAccess(ctx, offer.restaurantId, "offer.update");
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await updateOffer(id, updateData as any);
      return { success: true };
    }),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await getOfferById(input.id);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      }
      await assertRestaurantAccess(ctx, offer.restaurantId, "offer.delete");
      await deleteOffer(input.id);
      return { success: true };
    }),

  uploadImage: verifiedProcedure
    .input(z.object({
      offerId: z.number(),
      imageData: z.string(),
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      }
      await assertRestaurantAccess(ctx, offer.restaurantId, "offer.uploadImage");
      const buffer = Buffer.from(input.imageData, "base64");
      const { mimeType, fileSize } = validateEntityImageUpload({
        buffer,
        contentType: input.contentType,
        fileName: input.fileName,
      });
      const safeFileName = input.fileName.replace(/[^\w.\-]+/g, "_");
      const key = `offers/${offer.restaurantId}/${input.offerId}-${nanoid(8)}-${safeFileName}`;
      const { url, key: storageKey } = await putUploadedFile(key, buffer, mimeType, ctx.req);
      const image = buildEntityImageMetadata({
        storageKey,
        publicUrl: url,
        mimeType,
        fileSize,
        buffer,
      });
      await updateOffer(input.offerId, { imageUrl: url, image });
      return { url, image };
    }),

  deleteImage: verifiedProcedure
    .input(z.object({ offerId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      }
      await assertRestaurantAccess(ctx, offer.restaurantId, "offer.deleteImage");
      await updateOffer(input.offerId, { imageUrl: null, image: null });
      return { success: true };
    }),
});

const subscriptionRouter = router({
  listPlans: publicProcedure.query(async () => {
    return getSubscriptionPlans();
  }),

  getCurrentSubscription: verifiedProcedure.query(async ({ ctx }) => {
    const subscription = await getCanonicalUserSubscription(ctx.user.id);
    if (!subscription) return null;
    const plan = await getSubscriptionPlanById(subscription.planId);
    return { subscription, plan };
  }),

  getByRestaurant: verifiedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      const subscription = await getSubscriptionForRestaurant(input.restaurantId);
      if (!subscription) return null;
      const plan = await getSubscriptionPlanById(subscription.planId);
      return { subscription, plan };
    }),

  checkTrialStatus: verifiedProcedure.query(async ({ ctx }) => {
    return resolveTrialStatusRead(ctx.user.id);
  }),

  createCheckoutSession: verifiedProcedure
    .input(z.object({
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const plan = await getSubscriptionPlanById(input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const { createPayPalOrder } = await import("./paypal");
      const origin = ctx.req.headers.origin || "https://www.mineuqr.com";
      const returnUrl = `${origin}/subscription/success`;
      const cancelUrl = `${origin}/subscription/cancel`;

      const amount = input.billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
      if (!amount) throw new TRPCError({ code: "BAD_REQUEST", message: "السعر غير متوفر" });

      const orderId = await createPayPalOrder({
        userId: ctx.user.id,
        planId: input.planId,
        planName: plan.nameAr,
        amount: amount.toString(),
        currency: "USD",
        returnUrl,
        cancelUrl,
      });

      return { orderId };
    }),

  createTapCheckout: verifiedProcedure
    .input(z.object({
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const plan = await getSubscriptionPlanById(input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const { createTapCharge } = await import("./tap-payments");
      const origin = ctx.req.headers.origin || "https://www.mineuqr.com";
      const successUrl = `${origin}/subscription/success?tap_id={tap_id}`;
      const postUrl = `${origin}/api/tap/webhook`;

      const amount = input.billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
      if (!amount) throw new TRPCError({ code: "BAD_REQUEST", message: "السعر غير متوفر" });

      const amountNum = parseFloat(amount.toString());

      // Get user subscription to include in metadata
      const userSub = await getCanonicalUserSubscription(ctx.user.id);

      const charge = await createTapCharge({
        amount: amountNum,
        currency: "SAR",
        description: `اشتراك ${plan.nameAr} - ${input.billingCycle === "yearly" ? "سنوي" : "شهري"}`,
        customerFirstName: ctx.user.name || "عميل",
        customerLastName: "",
        customerEmail: ctx.user.email || "",
        redirectUrl: successUrl,
        postUrl,
        metadata: {
          user_id: ctx.user.id.toString(),
          plan_id: input.planId.toString(),
          billing_cycle: input.billingCycle,
          subscription_id: userSub?.id?.toString() || "",
        },
        reference: {
          transaction: `sub_${ctx.user.id}_${Date.now()}`,
          order: `plan_${input.planId}_${input.billingCycle}`,
        },
        langCode: "ar",
      });

      const checkoutUrl = charge.transaction?.url;
      if (!checkoutUrl) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إنشاء رابط الدفع" });
      }

      return { checkoutUrl };
    }),
});

const invoiceRouter = router({
  list: verifiedProcedure.query(async ({ ctx }) => {
    return getInvoicesByUser(ctx.user.id);
  }),

  getById: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const invoice = await getInvoiceById(input.id);
      if (!invoice || invoice.userId !== ctx.user.id) return null;
      return invoice;
    }),

  getUnpaid: verifiedProcedure.query(async ({ ctx }) => {
    return getUnpaidInvoices(ctx.user.id);
  }),
});

const countryCurrencyRouter = router({
  getByCountryCode: publicProcedure
    .input(z.object({ countryCode: z.string() }))
    .query(async ({ input }) => {
      return getCurrencyByCountryCode(input.countryCode);
    }),
  getAll: publicProcedure.query(async () => {
    return getAllCountriesCurrencies();
  }),
});

const notificationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getNotificationsByUser(ctx.user.id);
  }),

  getUnread: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadNotifications(ctx.user.id);
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const notifications = await getNotificationsByUser(ctx.user.id);
      const found = notifications.find(n => n.id === input.id);
      if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "التنبيه غير موجود" });
      await markNotificationAsRead(input.id);
      return { success: true };
     }),
});

const adminCoreRouter = router({
  createSubscriberAccount: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.createSubscriberAccount");
      // Check if email already exists
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
      }
      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);
      // Create user with openId = email (for local auth)
      const openId = `local_${input.email}`;
      await upsertUser({
        openId,
        name: input.name,
        email: input.email,
        loginMethod: "email",
        role: "user",
      });
      // Set password
      await updateUserPassword(openId, passwordHash);
      const created = await getUserByEmail(input.email);
      return { success: true, openId, userId: created?.id };
    }),

  resetSubscriberPassword: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.resetSubscriberPassword");
      return applyAdminPasswordReset({
        ctx,
        procedure: "admin.resetSubscriberPassword",
        email: input.email,
        newPassword: input.newPassword,
      });
    }),

  // ─── Admin Subscription Management ───────────────────────

  /** @deprecated AUTHORITY-CLEANUP-1 — use createUserSubscriptionByAdmin (account-level). */
  createRestaurantSubscription: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      userId: z.number().optional(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      subscriptionEndDate: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.createRestaurantSubscription");
      assertRestaurantScopedSubscriptionRetired("admin.createRestaurantSubscription");
    }),

  /** @deprecated AUTHORITY-CLEANUP-1 — use updateUserSubscriptionByAdmin. */
  updateRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      planId: z.number().optional(),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
      subscriptionEndDate: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.updateRestaurantSubscription");
      assertRestaurantScopedSubscriptionRetired("admin.updateRestaurantSubscription");
    }),

  /** @deprecated AUTHORITY-CLEANUP-1 — use updateUserSubscriptionByAdmin. */
  cancelRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.cancelRestaurantSubscription");
      assertRestaurantScopedSubscriptionRetired("admin.cancelRestaurantSubscription");
    }),

  /** @deprecated AUTHORITY-CLEANUP-1 — use deleteUserSubscriptionByAdmin. */
  deleteRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.deleteRestaurantSubscription");
      assertRestaurantScopedSubscriptionRetired("admin.deleteRestaurantSubscription");
    }),

  // ─── Admin Statistics ───────────────────────

  /** @deprecated EXEC-6 — Statistics.tsx dual-read only (renewal/churn/expired/canceled). Use analytics.* + getSubscriptionOverview. */
  getStatistics: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getStatistics");
      return getAdminStatistics();
    }),

  /** @deprecated EXEC-6 — Statistics.tsx dual-read only (revenue chart). Canonical analytics.getRevenueByMonth deferred. */
  getRevenueByMonth: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getRevenueByMonth");
      return getRevenueByMonth();
    }),

  getExtendedStats: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getExtendedStats");
      return getExtendedAdminStats();
    }),

  // ─── Users Management ───────────────────────
  listAllUsers: protectedProcedure
    .input(
      z
        .object({
          classificationFilter: z.enum(ACCOUNT_CLASSIFICATIONS).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.listAllUsers");
      const users = await getAllUsers({
        classificationFilter: input?.classificationFilter,
      });
      return users.map(sanitizeUserForAdminResponse);
    }),

  createInternalUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        role: z.enum(["user", "admin"]).default("user"),
        staffCategory: z.enum(INTERNAL_STAFF_CATEGORIES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.createInternalUser");
      const result = await createInternalUser({
        email: input.email,
        password: input.password,
        name: input.name,
        role: input.role,
        staffCategory: input.staffCategory,
      });
      logInternalUserCreated({
        ctx,
        procedure: "admin.createInternalUser",
        userId: result.userId,
        email: result.email,
        role: result.role,
        staffCategory: result.staffCategory,
      });
      return { success: true, ...result };
    }),

  updateAccountClassification: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        accountClassification: z.enum(ACCOUNT_CLASSIFICATIONS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "admin.updateAccountClassification");
      assertNotSelfAdminTarget(ctx, input.userId, "update_role");
      try {
        await assertProtectedUserClassificationModifiable(input.userId);
      } catch (error) {
        if (error instanceof ProtectedUserModifyError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن تعديل تصنيف هذا المستخدم المحمي",
          });
        }
        throw error;
      }

      const target = await getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (isForbiddenSystemAdminCombo(target.role, input.accountClassification)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SYSTEM accounts cannot have admin role",
        });
      }

      const previous = target.accountClassification;
      if (previous === input.accountClassification) {
        return { success: true, accountClassification: input.accountClassification };
      }

      await updateAccountClassification(input.userId, input.accountClassification);
      logAccountClassificationChanged({
        ctx,
        procedure: "admin.updateAccountClassification",
        targetUserId: input.userId,
        previousClassification: previous,
        nextClassification: input.accountClassification,
      });
      return { success: true, accountClassification: input.accountClassification };
    }),

  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.updateUserRole");
      return applyAdminUserRoleUpdate({
        ctx,
        procedure: "admin.updateUserRole",
        userId: input.userId,
        role: input.role,
      });
    }),

  deleteUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.deleteUser");
      assertNotSelfAdminTarget(ctx, input.userId, "delete_user");
      try {
        await deleteUserCascade(
          input.userId,
          cascadeAuditFromTrpc(ctx, "admin.deleteUser", "delete_user")
        );
      } catch (error) {
        if (error instanceof ProtectedUserDeleteError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن حذف هذا المستخدم المحمي",
          });
        }
        throw error;
      }
      return { success: true };
    }),

  // ─── Users Subscription Management by Admin ───
  createUserSubscriptionByAdmin: protectedProcedure
    .input(z.object({
      userId: z.number(),
      restaurantId: z.number().optional(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      subscriptionEndDate: z.string().optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.createUserSubscriptionByAdmin");
      const result = await applyAdminUserSubscriptionCreate({
        ctx,
        procedure: "admin.createUserSubscriptionByAdmin",
        userId: input.userId,
        restaurantId: input.restaurantId,
        planId: input.planId,
        billingCycle: input.billingCycle,
        subscriptionEndDate: input.subscriptionEndDate,
        status: input.status,
      });
      const plan = await getSubscriptionPlanById(input.planId);
      const planName = plan?.nameAr || "غير معروف";
      const statusLabel =
        result.subscriptionStatus === "active"
          ? "فعال"
          : result.subscriptionStatus === "trial"
            ? "تجريبي"
            : result.subscriptionStatus;
      try {
        const periodEndLabel = formatInRestaurantTimezone(result.periodEnd, "ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        await createNotification({
          userId: input.userId,
          subscriptionId: result.subscriptionId,
          notificationType: "subscription_created",
          message: `تم إنشاء اشتراك جديد لك في باقة "${planName}" بحالة ${statusLabel}. ينتهي في ${periodEndLabel}.`,
        });
      } catch (e) { /* notification failure is non-critical */ }
      return { success: true, subscriptionId: result.subscriptionId };
    }),
  updateUserSubscriptionByAdmin: protectedProcedure
    .input(z.object({
      userId: z.number(),
      planId: z.number().optional(),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
      subscriptionEndDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.updateUserSubscriptionByAdmin");
      const result = await applyAdminUserSubscriptionUpdate({
        ctx,
        procedure: "admin.updateUserSubscriptionByAdmin",
        userId: input.userId,
        planId: input.planId,
        billingCycle: input.billingCycle,
        status: input.status,
        subscriptionEndDate: input.subscriptionEndDate,
      });
      if (!result.changed) {
        return { success: true };
      }
      const subscriptionId = result.subscriptionId;
      const updatedPlan = input.planId ? await getSubscriptionPlanById(input.planId) : null;
      const changes: string[] = [];
      if (updatedPlan) changes.push(`الباقة: ${updatedPlan.nameAr}`);
      if (input.billingCycle) changes.push(`دورة الفوترة: ${input.billingCycle === "yearly" ? "سنوي" : "شهري"}`);
      if (input.status) {
        const statusMap: Record<string, string> = { active: "فعال", canceled: "ملغي", expired: "منتهي", trial: "تجريبي" };
        changes.push(`الحالة: ${statusMap[input.status] || input.status}`);
      }
      if (input.subscriptionEndDate) {
        const endDateLabel = formatInRestaurantTimezone(input.subscriptionEndDate, "ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        changes.push(`تاريخ الانتهاء: ${endDateLabel}`);
      }
      try {
        await createNotification({
          userId: input.userId,
          subscriptionId,
          notificationType: "subscription_updated",
          message: `تم تعديل اشتراكك. التغييرات: ${changes.join("، ") || "تحديث عام"}.`,
        });
      } catch (e) { /* notification failure is non-critical */ }
      return { success: true };
    }),
  deleteUserSubscriptionByAdmin: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.deleteUserSubscriptionByAdmin");
      await applyAdminUserSubscriptionDelete({
        ctx,
        procedure: "admin.deleteUserSubscriptionByAdmin",
        userId: input.userId,
      });
      // Send notification to user
      try {
        await createNotification({
          userId: input.userId,
          notificationType: "subscription_deleted",
          message: "تم إلغاء اشتراكك من قبل المسؤول. تواصل مع الإدارة لمزيد من المعلومات.",
        });
      } catch (e) { /* notification failure is non-critical */ }
      return { success: true };
    }),
  sendCustomNotification: protectedProcedure
    .input(z.object({
      userId: z.number(),
      message: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.sendCustomNotification");
      await createNotification({
        userId: input.userId,
        notificationType: "custom_message",
        message: input.message,
      });
      return { success: true };
    }),
  sendBulkNotification: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.sendBulkNotification");
      const allUsers = await getAllUsers();
      let sentCount = 0;
      for (const user of allUsers) {
        try {
          await createNotification({
            userId: user.id,
            notificationType: "custom_message",
            message: input.message,
          });
          sentCount++;
        } catch (e) { /* skip failed */ }
      }
      return { success: true, sentCount };
    }),

  // ─── Invoice PDF Generation ───────────────────────
  generateInvoicePDF: protectedProcedure
    .input(z.object({
      userId: z.number(),
      subscriptionId: z.number(),
      markAsPaid: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.generateInvoicePDF");
      try {
        await assertProtectedUserSubscriptionModifiable(input.userId);
      } catch (error) {
        if (error instanceof ProtectedUserModifyError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إنشاء فاتورة لهذا المستخدم المحمي",
          });
        }
        throw error;
      }
      // Get user info
      const targetUser = await getUserById(input.userId);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }
      // Get subscription info
      const sub = await getOwnerAccountSubscriptionRow(input.userId);
      if (!sub) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك حساب لهذا المستخدم" });
      }
      if (sub.id !== input.subscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "subscriptionId must match the owner's account-level subscription",
        });
      }
      assertSubscriptionEligibleForAdminInvoice(sub.status);
      // Get plan info
      const plan = await getSubscriptionPlanById(sub.planId);
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الباقة غير موجودة" });
      }
      // Calculate amount
      const amount = sub.billingCycle === "yearly"
        ? (plan.priceYearly || plan.priceMonthly)
        : plan.priceMonthly;
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${input.userId}`;
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);
      const invoiceStatus = input.markAsPaid ? "paid" : "pending";
      const paidAt = input.markAsPaid ? now.toISOString() : undefined;
      // Create invoice record
      const invoiceResult = await createInvoice({
        userId: input.userId,
        subscriptionId: sub.id,
        amount: amount.toString(),
        currency: "USD",
        status: invoiceStatus,
        invoiceNumber,
        issuedAt: now.toISOString(),
        dueAt: dueDate.toISOString(),
        paidAt,
      });
      // Generate PDF
      const pdfBuffer = await generateInvoicePDFBuffer({
        invoiceNumber,
        customerName: targetUser.name || targetUser.email || "Customer",
        planName: plan.nameEn || plan.nameAr,
        amount: amount.toString(),
        currency: "USD",
        issuedAt: now.toISOString(),
        status: invoiceStatus,
        paidAt,
        billingCycle: sub.billingCycle || "monthly",
      });
      const fileKey = `pdfs/${input.userId}/${invoiceNumber}.pdf`;
      const { url: pdfUrl } = await putUploadedFile(fileKey, pdfBuffer, "application/pdf", ctx.req);
      // Update invoice with PDF URL
      await updateInvoice(invoiceResult.id, { pdfUrl });
      return { success: true, pdfUrl, invoiceId: invoiceResult.id };
    }),

  // ─── Get User Invoices (Admin) ───────────────────────
  getUserInvoices: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.getUserInvoices");
      return getInvoicesByUser(input.userId);
    }),
});

const adminRouter = mergeRouters(adminCoreRouter, adminDashboardReadRouter, adminAuditRouter);

// ─── Public Stats Router (no auth required) ───
const publicStatsRouter = router({
  get: publicProcedure.query(async () => {
    return getPublicStats();
  }),
});

const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      loginMethod: ctx.user.loginMethod,
      createdAt: ctx.user.createdAt,
      emailVerifiedAt: ctx.user.emailVerifiedAt,
      canChangePassword: canChangeOwnPassword(ctx.user),
    };
  }),
  update: verifiedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email
        ? normalizeAccountEmailOrNull(input.email)
        : undefined;
      if (input.email && !normalizedEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يرجى إدخال بريد إلكتروني صالح",
        });
      }

      const emailChanged =
        normalizedEmail !== undefined &&
        accountEmailChanged(ctx.user.email, normalizedEmail);

      if (normalizedEmail) {
        const existing = await getUserByEmail(normalizedEmail);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }

      await updateUserProfile(ctx.user.id, {
        name: input.name,
        email: emailChanged ? normalizedEmail! : undefined,
        clearEmailVerification: emailChanged,
      });

      if (emailChanged && normalizedEmail) {
        await sendVerificationEmailForUser(ctx.req, {
          id: ctx.user.id,
          email: normalizedEmail,
        });
      }

      return { success: true };
    }),
  changePassword: verifiedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!canChangeOwnPassword(ctx.user)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تغيير كلمة المرور غير متاح لهذا الحساب",
        });
      }
      const valid = await bcrypt.compare(
        input.currentPassword,
        ctx.user.passwordHash!
      );
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await updateUserPassword(ctx.user.openId, newHash);
      return { success: true };
    }),
});

// ─── Contact Router ───────────────────────────────────────
const contactRouter = router({
  send: publicProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      subject: z.string().min(3),
      message: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      try {
        const { sendEmail } = await import("./email");
        const timestamp = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Damascus' });
        
        // إيميل احترافي للمسؤول
        const emailContent = `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
            <div style="background: linear-gradient(135deg, #0d2b2b, #143d3d); padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: #2dd4bf; margin: 0; font-size: 20px;">📩 رسالة جديدة من نموذج التواصل</h2>
              <p style="color: #94a3b8; margin: 8px 0 0; font-size: 13px;">${timestamp}</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155; width: 120px;">الاسم</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${input.name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155;">البريد</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${input.email}" style="color: #0d9488;">${input.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155;">الموضوع</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${input.subject}</td>
                </tr>
              </table>
              <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="font-weight: bold; color: #334155; margin: 0 0 8px;">الرسالة:</p>
                <p style="color: #475569; line-height: 1.7; margin: 0;">${input.message.replace(/\n/g, "<br>")}</p>
              </div>
            </div>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">يمكنك الرد مباشرة على <a href="mailto:${input.email}" style="color: #0d9488;">${input.email}</a></p>
            </div>
          </div>
        `;
        
        // Primary delivery: SMTP email (success/failure drives user-facing result).
        const emailSent = await sendEmail({
          to: "info@mineuqr.com",
          subject: `📩 رسالة جديدة: ${input.subject} - من ${input.name}`,
          html: emailContent,
        });

        if (!emailSent) {
          console.error("[Contact] Primary email delivery failed", {
            to: "info@mineuqr.com",
            fromEmail: input.email,
            subject: input.subject,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً",
          });
        }

        return { success: true, message: "تم إرسال رسالتك بنجاح" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("[Contact] Unexpected error sending contact message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً",
        });
      }
    }),
});

// ─── Holiday Router ────────────────────────────────────────────────────────────────────────────────────────────────
const holidayRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "holiday.list");
      return getHolidaysByRestaurant(input.restaurantId);
    }),

  listPublic: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      const today = todayYmd();
      const holidays = await getHolidaysByRestaurant(input.restaurantId);
      return holidays.filter(h => h.date >= today);
    }),

  create: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      titleAr: z.string().min(1),
      titleEn: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      isFullDayClosed: z.boolean().default(true),
      openTime: z.string().optional(),
      closeTime: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "holiday.create");
      const id = await createHoliday(input);
      return { success: true, id };
    }),

  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      titleAr: z.string().min(1).optional(),
      titleEn: z.string().optional().nullable(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      isFullDayClosed: z.boolean().optional(),
      openTime: z.string().optional().nullable(),
      closeTime: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const holiday = await getHolidayById(input.id);
      if (!holiday) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertRestaurantAccess(ctx, holiday.restaurantId, "holiday.update");
      const { id, ...data } = input;
      await updateHoliday(id, data);
      return { success: true };
    }),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const holiday = await getHolidayById(input.id);
      if (!holiday) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertRestaurantAccess(ctx, holiday.restaurantId, "holiday.delete");
      await deleteHoliday(input.id);
      return { success: true };
    }),
});

// ─── Table Management Router ─────────────────────────────────
const tableRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return getTablesByRestaurant(input.restaurantId);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const table = await getTableById(input.id);
      if (!table) return null;
      await assertRestaurantAccess(ctx, table.restaurantId);
      return table;
    }),
  create: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      tableNumber: z.number(),
      nameAr: z.string().optional(),
      nameEn: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return createTable(input);
    }),
  createMultiple: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      count: z.number().min(1).max(500),
      startFrom: z.number().min(1).default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return createMultipleTables(input.restaurantId, input.count, input.startFrom);
    }),
  update: verifiedProcedure
    .input(z.object({
      id: z.number(),
      tableNumber: z.number().optional(),
      nameAr: z.string().optional(),
      nameEn: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const table = await getTableById(input.id);
      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الطاولة غير موجودة",
        });
      }
      await assertRestaurantAccess(ctx, table.restaurantId);
      const { id, ...data } = input;
      await updateTable(id, data);
      return { success: true };
    }),
  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const table = await getTableById(input.id);
      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الطاولة غير موجودة",
        });
      }
      await assertRestaurantAccess(ctx, table.restaurantId);
      await deleteTable(input.id);
      return { success: true };
    }),
  // Public: get table by restaurant and number (for ordering)
  getByNumber: publicProcedure
    .input(z.object({ restaurantId: z.number(), tableNumber: z.number() }))
    .query(async ({ input }) => {
      return getTableByRestaurantAndNumber(input.restaurantId, input.tableNumber);
    }),
});

// ─── Dining Session Router (TABLE-MANAGEMENT-1 D4) ─────────────
const sessionRouter = router({
  getActiveByTable: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(128),
        tableNumber: z.number().int().min(1),
      })
    )
    .query(async ({ input }) => {
      return getPublicActiveSessionByTable(input.slug, input.tableNumber);
    }),
  getByToken: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(128),
        sessionToken: z
          .string()
          .min(16)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
    )
    .query(async ({ input }) => {
      return getPublicSessionByToken(input.slug, input.sessionToken);
    }),
  getOwnerTimeline: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      try {
        return await getOwnerSessionTimeline(input.restaurantId, input.sessionId);
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
  getOwnerWorkspace: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      try {
        return await getOwnerSessionWorkspace(input.restaurantId, input.sessionId);
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
  markPaid: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      try {
        await markPaid({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          actorUserId: ctx.user.id,
        });
        return await getOwnerSessionWorkspace(input.restaurantId, input.sessionId);
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
  markComplimentary: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      try {
        await markComplimentary({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          actorUserId: ctx.user.id,
        });
        return await getOwnerSessionWorkspace(input.restaurantId, input.sessionId);
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
  close: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      try {
        await closeSession({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          actorUserId: ctx.user.id,
        });
        return await getOwnerSessionWorkspace(input.restaurantId, input.sessionId);
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
});

// ─── Order Router ────────────────────────────────────────────
const orderRouter = router({
  // Public: check if ordering is enabled for this restaurant
  canOrder: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      return resolveGuestOrderingAllowed(input.restaurantId);
    }),
  // Public: create order (no auth needed)
  create: publicProcedure
    .input(z.object({
      restaurantId: z.number(),
      tableId: z.number(),
      tableNumber: z.number().int().min(1),
      customerName: z.string().nullish(),
      customerPhone: z.string().nullish(),
      notes: z.string().nullish(),
      items: z.array(z.object({
        menuItemId: z.number(),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().nullish(),
        /** Ignored if sent — server uses DB menu prices (LAUNCH-HARDENING-1A). */
        nameAr: z.string().optional(),
        nameEn: z.string().nullish().optional(),
        price: z.string().optional(),
      })).min(1),
      sessionToken: z
        .string()
        .min(16)
        .max(64)
        .regex(SESSION_TOKEN_PATTERN)
        .optional(),
    }))
    .mutation(async ({ input }) => {
      const restaurant = await getRestaurantById(input.restaurantId);
      if (!restaurant) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "المطعم غير موجود" });
      }
      if (!restaurant.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "المطعم غير متاح حالياً" });
      }

      const temporaryClosure = parseTemporaryClosure(restaurant.temporaryClosure);
      if (temporaryClosure?.active) {
        throw new TRPCError({ code: "FORBIDDEN", message: "المطعم مغلق مؤقتاً" });
      }

      if (restaurant.workingHours) {
        const openNow = isRestaurantOpen({
          workingHours: restaurant.workingHours,
          temporaryClosure: restaurant.temporaryClosure,
          applyTemporaryClosure: false,
        });
        if (!openNow) {
          throw new TRPCError({ code: "FORBIDDEN", message: "المطعم مغلق حالياً" });
        }
      }

      const { canOrder: allowsOrdering } = await resolveGuestOrderingAllowed(
        input.restaurantId
      );
      if (!allowsOrdering) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ميزة الطلب عبر المنيو متاحة فقط للمشتركين في الخطة الاحترافية أو المؤسسية' });
      }

      const table = await getTableByRestaurantAndNumber(input.restaurantId, input.tableNumber);
      if (!table) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
      }

      let sessionId: number | undefined;
      let sessionToken: string | undefined;
      if (ENV.tableSessionDualWrite) {
        try {
          // OPERATIONAL-SESSION-PLATFORM-1 — QR table path via Operational Session Platform.
          // Dining Session remains the table specialization (no rename / no behaviour change).
          const sessionResult = await resolveOperationalSession({
            restaurantId: input.restaurantId,
            anchor: createTableSessionAnchor({
              tableId: table.id,
              tableNumber: table.tableNumber,
            }),
            sessionToken: input.sessionToken,
          });
          // Table specialization always returns a persistent session when successful.
          if (!sessionResult.session) {
            throw new Error("Table Operational Session resolution returned no session");
          }
          sessionId = sessionResult.session.id;
          sessionToken = sessionResult.session.sessionToken;
          opsLog({
            type: sessionResult.created ? OPS_EVENT.session_created : OPS_EVENT.session_reused,
            category: "ORDER",
            severity: "info",
            ts: new Date().toISOString(),
            restaurantId: input.restaurantId,
            procedure: "order.create",
            metadata: {
              sessionId: sessionResult.session.id,
              tableId: table.id,
              tableNumber: table.tableNumber,
              anchorType: sessionResult.session.anchor.anchorType,
            },
          });
        } catch (err) {
          throwSessionServiceTrpcError(err);
        }
      }

      // ORDER-IDENTITY-RUNTIME-1 — table ordering as Fulfilment Anchor type `table`.
      const orderIdentity = createTableOrderIdentity({
        tableId: table.id,
        tableNumber: table.tableNumber,
        sessionId: ENV.tableSessionDualWrite && sessionId != null ? sessionId : null,
        sessionToken:
          ENV.tableSessionDualWrite && sessionToken != null ? sessionToken : null,
      });

      const placeResult = await runOrderCommand(() =>
        placeOrderService.execute({
          restaurantId: input.restaurantId,
          identity: orderIdentity,
          tableId: table.id,
          tableNumber: table.tableNumber,
          ...(ENV.tableSessionDualWrite && sessionId != null
            ? { sessionId }
            : {}),
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          notes: input.notes,
          items: input.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        })
      );

      return {
        orderId: placeResult.order.id,
        orderNumber: placeResult.orderNumber,
        trackingToken: placeResult.trackingToken,
        tableNumber: table.tableNumber,
        totalAmount: placeResult.totalAmount,
        itemCount: placeResult.itemCount,
        createdAt: placeResult.createdAt,
        status: "pending" as const,
        ...(ENV.tableSessionDualWrite && sessionToken
          ? { sessionToken }
          : {}),
      };
    }),
  // Verified: list orders for restaurant owner (live order operations)
  list: verifiedProcedure
    .input(z.object({
      restaurantId: z.number(),
      status: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      const rows = await getOrdersWithItemsByRestaurant(input.restaurantId, input.status);
      return rows.map((order) => {
        const identity = mapOrderDisplayIdentityFields({
          orderNumber: order.orderNumber,
          businessDay: order.businessDay ?? null,
          dailyDisplayNumber: order.dailyDisplayNumber ?? null,
        });
        return { ...order, ...identity };
      });
    }),
  getById: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const order = await getOrderById(input.id);
      if (!order) return null;
      await assertRestaurantAccess(ctx, order.restaurantId);
      const items = await getOrderItemsByOrderId(input.id);
      return { ...order, items };
    }),
  updateStatus: verifiedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      const order = await getOrderById(input.id);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }
      await assertRestaurantAccess(ctx, order.restaurantId, "order.updateStatus");

      const restaurant = await getRestaurantById(order.restaurantId);
      const actor = resolveOrderActorFromUser(
        ctx.user,
        order.restaurantId,
        restaurant?.userId ?? ctx.user.id
      );

      const result = await runOrderCommand(() =>
        advanceOrderStatusService.execute({
          orderId: input.id,
          targetStatus: input.status,
          actor,
        })
      );

      return {
        success: true,
        orderId: input.id,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
      };
    }),
  activeCount: verifiedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return getActiveOrdersCount(input.restaurantId);
    }),
  // Public: customer order status (PR-CUX-1B — trackingToken authority only)
  getPublicStatus: publicProcedure
    .input(
      z.object({
        trackingToken: z
          .string()
          .min(16)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
        slug: z.string().min(1).max(128),
      })
    )
    .query(async ({ input }) => {
      const row = await getOrderByTrackingToken(input.trackingToken, input.slug);
      if (!row) return null;

      let diningSessionStatus: import("./diningSession/sessionTypes").DiningSessionStatus | null =
        null;
      let diningSessionToken: string | null = null;
      if (ENV.tableSessionDualWrite && row.sessionId != null) {
        const session = await findSessionById(row.sessionId);
        diningSessionStatus = session?.status ?? null;
        diningSessionToken = session?.sessionToken ?? null;
      }

      return toPublicOrderStatus(
        {
          orderId: row.orderId,
          sessionId: row.sessionId,
          orderNumber: row.orderNumber,
          tableNumber: row.tableNumber,
          status: row.status as
            | "pending"
            | "preparing"
            | "ready"
            | "served"
            | "cancelled",
          totalAmount: String(row.totalAmount),
          createdAt: row.createdAt,
          readyAt: row.readyAt ?? null,
          nameAr: row.nameAr,
          nameEn: row.nameEn,
          currencySymbol: row.currencySymbol,
          tableLabel: row.tableLabel,
          itemCount: row.itemCount,
        },
        { diningSessionStatus, diningSessionToken }
      );
    }),
  /** @deprecated Use getPublicStatus — orderNumber lookup is not supported for customers. */
  trackOrder: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async () => null),
  read: orderReadRouter,
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      clearSessionCookie(ctx.res, ctx.req);
      // Stateless revocation boundary: invalidate any already-issued sessions for this user.
      // This keeps architecture stateless (no per-session storage), but makes logout meaningful
      // against replayed cookies.
      if (ctx.user) {
        await updateUserSessionValidAfter(ctx.user.openId);
      }
      return { success: true } as const;
    }),
  }),
  restaurant: restaurantRouter,
  category: categoryRouter,
  menuItem: menuItemRouter,
  offer: offerRouter,
  subscription: subscriptionRouter,
  commercial: commercialRouter,
  analytics: analyticsRouter,
  invoice: invoiceRouter,
  notification: notificationRouter,
  countryCurrency: countryCurrencyRouter,
  admin: adminRouter,
  profile: profileRouter,
  publicStats: publicStatsRouter,
  contact: contactRouter,
  holiday: holidayRouter,
  table: tableRouter,
  session: sessionRouter,
  order: orderRouter,
  ordering: orderingRouter,
  ops: opsRouter,
  kitchen: kitchenRouter,
  printWorkspace: printWorkspaceRouter,
  operationalDevice: operationalDeviceRouter,
  printConnector: printConnectorRouter,
  printerManagement: printerManagementRouter,
});
export type AppRouter = typeof appRouter;
