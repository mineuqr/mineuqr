import { clearSessionCookie } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getRestaurantsByUser, getRestaurantById, getRestaurantBySlug,
  createRestaurant, updateRestaurant, incrementViewCount,
  getCategoriesByRestaurant, getCategoryById, createCategory, updateCategory, deleteCategory,
  getMenuItemsByCategory, getMenuItemsByRestaurant, getMenuItemById,
  createMenuItem, updateMenuItem, deleteMenuItem, getRestaurantStats,
  getSubscriptionPlans, getSubscriptionPlanById, createUserSubscription, getUserSubscription,
  updateUserSubscription, isSubscriptionActive, getTrialEndDate,
  getOffersByRestaurant, getActiveOffersByRestaurant, getOfferById, createOffer, updateOffer, deleteOffer,
  getInvoicesByUser, getInvoiceById, getUnpaidInvoices,
  getNotificationsByUser, getUnreadNotifications, markNotificationAsRead, createNotification,
  getCurrencyByCountryCode, getAllCountriesCurrencies,
  upsertUser, getUserByEmail, updateUserPassword, updateUserProfile,
  getAllRestaurantsWithSubscriptions, createSubscriptionForRestaurant, updateSubscriptionById, cancelSubscriptionById, getSubscriptionByRestaurantId,
  getAdminStatistics, getRevenueByMonth, getSubscriptionDetails,
  getPublicStats, getExtendedAdminStats,
  getAllUsers, updateUserRole,
  getAllUsersWithSubscriptions,
  createInvoice, updateInvoice, getUserById,
  updateUserSessionValidAfter,
  getHolidaysByRestaurant, createHoliday, updateHoliday, deleteHoliday, getHolidayById,
  getTablesByRestaurant, getTableById, getTableByRestaurantAndNumber, createTable, updateTable, deleteTable, createMultipleTables,
  getOrdersByRestaurant, getOrdersWithItemsByRestaurant, getOrderById, createOrder, updateOrderStatus, getOrderItemsByOrderId, createOrderItems, generateOrderNumber, getActiveOrdersCount,
  restaurantAllowsTableOrdering,
} from "./db";
import { canChangeOwnPassword } from "./auth-local/httpHelpers";
import { assertRestaurantAccess } from "./restaurantAccess";
import { assertAdminAccess, assertNotSelfAdminTarget } from "./_core/assertAdminAccess";
import {
  deleteRestaurantCascade,
  deleteSubscriptionCascade,
  deleteUserCascade,
  ProtectedUserDeleteError,
} from "./db/cascadeDeletes";
import { cascadeAuditFromTrpc } from "./db/cascadeAudit";
import { isRestaurantOpen, parseTemporaryClosure } from "./lib/restaurantHours";
import { formatInRestaurantTimezone, todayYmd } from "@shared/utils/timezone";
import { putUploadedFile } from "./local-uploads";
import { notifyOwner } from "./_core/notification";
import { notifyOwnerNewRestaurant, notifyOwnerNewSubscription, notifyOwnerSubscriptionCancelled } from "./owner-email-notifications";
import { generateInvoicePDFBuffer } from "./invoice-pdf";
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

  create: protectedProcedure
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
    }))
    .mutation(async ({ input, ctx }) => {
      const slug = generateSlug(input.nameAr);
      const result = await createRestaurant({
        ...input,
        userId: ctx.user.id,
        slug,
      });
      // Notify owner about new restaurant
      try {
        await notifyOwner({
          title: "مطعم جديد تم إضافته",
          content: `تم إضافة مطعم جديد: ${input.nameAr} بواسطة ${ctx.user.name || "مستخدم"}`,
        });
      } catch (e) { /* notification failure is non-critical */ }
      // Send email notification to owner
      try {
        await notifyOwnerNewRestaurant({
          restaurantNameAr: input.nameAr,
          restaurantNameEn: input.nameEn,
          ownerName: ctx.user.name,
          ownerEmail: ctx.user.email,
        });
      } catch (e) { /* email notification failure is non-critical */ }
      return { ...result, slug };
    }),

  update: protectedProcedure
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

  delete: protectedProcedure
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
        // Notify at milestones
        const newCount = restaurant.viewCount + 1;
        if (newCount === 100 || newCount === 500 || newCount === 1000 || newCount % 1000 === 0) {
          try {
            await notifyOwner({
              title: `إنجاز جديد في الزيارات!`,
              content: `مطعم "${restaurant.nameAr}" وصل إلى ${newCount} زيارة!`,
            });
          } catch (e) { /* non-critical */ }
        }
      }
      return { success: true };
    }),

  updateTemplate: protectedProcedure
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
        const active = await isSubscriptionActive(ctx.user.id);
        const trialEnd = await getTrialEndDate(ctx.user.id);
        const isTrialActive = trialEnd ? new Date(trialEnd) > new Date() : false;
        if (!active && !isTrialActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "هذا القالب متاح فقط للمشتركين في الخطة المدفوعة" });
        }
      }
        }
      // Clear custom colors when changing template to use new template's defaults
      await updateRestaurant(input.id, { menuTemplate: input.menuTemplate, customColors: null });
      return { success: true };
    }),

  updateCustomColors: protectedProcedure
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
        const active = await isSubscriptionActive(ctx.user.id);
        const trialEnd = await getTrialEndDate(ctx.user.id);
        const isTrialActive = trialEnd ? new Date(trialEnd) > new Date() : false;
        if (!active && !isTrialActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u064a \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629" });
        }
      }
      await updateRestaurant(input.id, { customColors: input.customColors ? JSON.stringify(input.customColors) : null });
      return { success: true };
    }),

  updateCustomFonts: protectedProcedure
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
        const active = await isSubscriptionActive(ctx.user.id);
        const trialEnd = await getTrialEndDate(ctx.user.id);
        const isTrialActive = trialEnd ? new Date(trialEnd) > new Date() : false;
        if (!active && !isTrialActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u062e\u0637\u0648\u0637 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u064a \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629" });
        }
      }
      await updateRestaurant(input.id, { customFonts: input.customFonts ? JSON.stringify(input.customFonts) : null });
      return { success: true };
    }),

  uploadImage: protectedProcedure
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

  deleteImage: protectedProcedure
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

  create: protectedProcedure
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
      return createCategory(input);
    }),

  update: protectedProcedure
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

  delete: protectedProcedure
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

  create: protectedProcedure
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

      return createMenuItem(input);
    }),

  update: protectedProcedure
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

  delete: protectedProcedure
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

  uploadImage: protectedProcedure
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

  create: protectedProcedure
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

  update: protectedProcedure
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

  delete: protectedProcedure
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

  uploadImage: protectedProcedure
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
      const safeFileName = input.fileName.replace(/[^\w.\-]+/g, "_");
      const key = `offers/${offer.restaurantId}/${input.offerId}-${nanoid(8)}-${safeFileName}`;
      const { url } = await putUploadedFile(key, buffer, input.contentType, ctx.req);
      await updateOffer(input.offerId, { imageUrl: url });
      return { url };
    }),
});

const subscriptionRouter = router({
  listPlans: publicProcedure.query(async () => {
    return getSubscriptionPlans();
  }),

  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getUserSubscription(ctx.user.id);
    if (!subscription) return null;
    const plan = await getSubscriptionPlanById(subscription.planId);
    return { subscription, plan };
  }),

  getByRestaurant: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      const subscription = await getSubscriptionByRestaurantId(input.restaurantId);
      if (!subscription) return null;
      const plan = await getSubscriptionPlanById(subscription.planId);
      return { subscription, plan };
    }),

  checkTrialStatus: protectedProcedure.query(async ({ ctx }) => {
    const isActive = await isSubscriptionActive(ctx.user.id);
    const trialEndDate = await getTrialEndDate(ctx.user.id);
    return { isActive, trialEndDate };
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const plan = await getSubscriptionPlanById(input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const { createPayPalOrder } = await import("./paypal");
      const origin = ctx.req.headers.origin || "https://qr-menu.manus.space";
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

  createTapCheckout: protectedProcedure
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
      const userSub = await getUserSubscription(ctx.user.id);

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
  list: protectedProcedure.query(async ({ ctx }) => {
    return getInvoicesByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const invoice = await getInvoiceById(input.id);
      if (!invoice || invoice.userId !== ctx.user.id) return null;
      return invoice;
    }),

  getUnpaid: protectedProcedure.query(async ({ ctx }) => {
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

const adminRouter = router({
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
      return { success: true, openId };
    }),

  resetSubscriberPassword: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.resetSubscriberPassword");
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }
      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await updateUserPassword(user.openId, passwordHash);
      return { success: true };
    }),

  // ─── Admin Subscription Management ───────────────────────

  listAllRestaurantsWithSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.listAllRestaurantsWithSubscriptions");
      return getAllRestaurantsWithSubscriptions();
    }),

  createRestaurantSubscription: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      userId: z.number().optional(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      subscriptionEndDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.createRestaurantSubscription");
      // Check if restaurant already has subscription
      const existing = await getSubscriptionByRestaurantId(input.restaurantId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "المطعم لديه اشتراك بالفعل" });
      }
      const now = new Date();
      let periodEnd: Date;
      if (input.subscriptionEndDate) {
        periodEnd = new Date(input.subscriptionEndDate);
      } else {
        periodEnd = new Date();
        if (input.billingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
      }
      const result = await createSubscriptionForRestaurant({
        userId: input.userId || ctx.user.id,
        restaurantId: input.restaurantId,
        planId: input.planId,
        status: "active",
        billingCycle: input.billingCycle,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      });
      return { success: true, subscriptionId: result.id };
    }),

  updateRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      planId: z.number().optional(),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
      subscriptionEndDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.updateRestaurantSubscription");
      const updateData: Record<string, any> = {};
      if (input.planId !== undefined) updateData.planId = input.planId;
      if (input.billingCycle !== undefined) updateData.billingCycle = input.billingCycle;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.subscriptionEndDate) updateData.currentPeriodEnd = new Date(input.subscriptionEndDate).toISOString();
      await updateSubscriptionById(input.subscriptionId, updateData);
      return { success: true };
    }),

  cancelRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.cancelRestaurantSubscription");
      await cancelSubscriptionById(input.subscriptionId);
      // Send email notification to owner about cancellation
      try {
        await notifyOwnerSubscriptionCancelled({
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          planName: "غير محدد",
          subscriptionId: input.subscriptionId,
        });
      } catch (e) { /* email notification failure is non-critical */ }
      return { success: true };
    }),

  deleteRestaurantSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.deleteRestaurantSubscription");
      await deleteSubscriptionCascade(
        input.subscriptionId,
        cascadeAuditFromTrpc(ctx, "admin.deleteRestaurantSubscription", "delete_subscription")
      );
      return { success: true };
    }),

  // ─── Admin Statistics ───────────────────────

  getStatistics: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getStatistics");
      return getAdminStatistics();
    }),

  getRevenueByMonth: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getRevenueByMonth");
      return getRevenueByMonth();
    }),

  getSubscriptionDetails: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getSubscriptionDetails");
      return getSubscriptionDetails();
    }),

  getExtendedStats: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.getExtendedStats");
      return getExtendedAdminStats();
    }),

  // ─── Users Management ───────────────────────
  listAllUsers: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.listAllUsers");
      return getAllUsers();
    }),

  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.updateUserRole");
      assertNotSelfAdminTarget(ctx, input.userId, "update_role");
      return updateUserRole(input.userId, input.role);
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
  listAllUsersWithSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "admin.listAllUsersWithSubscriptions");
      return getAllUsersWithSubscriptions();
    }),
  createUserSubscriptionByAdmin: protectedProcedure
    .input(z.object({
      userId: z.number(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      subscriptionEndDate: z.string().optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.createUserSubscriptionByAdmin");
      const existing = await getUserSubscription(input.userId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "المستخدم لديه اشتراك بالفعل. استخدم التعديل بدلاً من الإنشاء." });
      }
      const now = new Date();
      let periodEnd: Date;
      if (input.subscriptionEndDate) {
        periodEnd = new Date(input.subscriptionEndDate);
      } else {
        periodEnd = new Date();
        if (input.billingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
      }
      const userRestaurants = await getRestaurantsByUser(input.userId);
      const restaurantId = userRestaurants[0]?.id || 0;
      const result = await createSubscriptionForRestaurant({
        userId: input.userId,
        restaurantId,
        planId: input.planId,
        status: input.status || "active",
        billingCycle: input.billingCycle,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      });
      // Send notification to user
      const plan = await getSubscriptionPlanById(input.planId);
      const planName = plan?.nameAr || "غير معروف";
      const statusLabel = input.status === "active" ? "فعال" : input.status === "trial" ? "تجريبي" : input.status || "فعال";
      try {
        const periodEndLabel = formatInRestaurantTimezone(periodEnd, "ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        await createNotification({
          userId: input.userId,
          subscriptionId: result.id,
          notificationType: "subscription_created",
          message: `تم إنشاء اشتراك جديد لك في باقة "${planName}" بحالة ${statusLabel}. ينتهي في ${periodEndLabel}.`,
        });
      } catch (e) { /* notification failure is non-critical */ }
      // Auto-generate invoice PDF
      try {
        const amount = input.billingCycle === "yearly"
          ? (plan?.priceYearly || plan?.priceMonthly || "0")
          : (plan?.priceMonthly || "0");
        const invoiceNumber = `INV-${Date.now()}-${input.userId}`;
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 30);
        const invoiceResult = await createInvoice({
          userId: input.userId,
          subscriptionId: result.id,
          amount: amount.toString(),
          currency: "USD",
          status: "paid",
          invoiceNumber,
          issuedAt: now.toISOString(),
          dueAt: dueDate.toISOString(),
          paidAt: now.toISOString(),
        });
        const targetUser = await getUserById(input.userId);
        const pdfBuffer = await generateInvoicePDFBuffer({
          invoiceNumber,
          customerName: targetUser?.name || targetUser?.email || "Customer",
          planName: plan?.nameEn || plan?.nameAr || "Subscription",
          amount: amount.toString(),
          currency: "USD",
          issuedAt: now.toISOString(),
          status: "paid",
          paidAt: now.toISOString(),
          billingCycle: input.billingCycle,
        });
        const fileKey = `pdfs/${input.userId}/${invoiceNumber}.pdf`;
        const { url: pdfUrl } = await putUploadedFile(fileKey, pdfBuffer, "application/pdf", ctx.req);
        await updateInvoice(invoiceResult.id, { pdfUrl });
      } catch (e) { /* invoice generation failure is non-critical */ }
      return { success: true, subscriptionId: result.id };
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
      const existing = await getUserSubscription(input.userId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك لهذا المستخدم" });
      }
      const updateData: Record<string, any> = {};
      if (input.planId !== undefined) updateData.planId = input.planId;
      if (input.billingCycle !== undefined) updateData.billingCycle = input.billingCycle;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.subscriptionEndDate) updateData.currentPeriodEnd = new Date(input.subscriptionEndDate).toISOString();
      await updateSubscriptionById(existing.id, updateData);
      // Send notification to user
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
          subscriptionId: existing.id,
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
      const existing = await getUserSubscription(input.userId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك لهذا المستخدم" });
      }
      await deleteSubscriptionCascade(
        existing.id,
        cascadeAuditFromTrpc(ctx, "admin.deleteUserSubscriptionByAdmin", "delete_subscription")
      );
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
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.generateInvoicePDF");
      // Get user info
      const targetUser = await getUserById(input.userId);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }
      // Get subscription info
      const sub = await getUserSubscription(input.userId);
      if (!sub) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك لهذا المستخدم" });
      }
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
      // Create invoice record
      const invoiceResult = await createInvoice({
        userId: input.userId,
        subscriptionId: sub.id,
        amount: amount.toString(),
        currency: "USD",
        status: "paid",
        invoiceNumber,
        issuedAt: now.toISOString(),
        dueAt: dueDate.toISOString(),
        paidAt: now.toISOString(),
      });
      // Generate PDF
      const pdfBuffer = await generateInvoicePDFBuffer({
        invoiceNumber,
        customerName: targetUser.name || targetUser.email || "Customer",
        planName: plan.nameEn || plan.nameAr,
        amount: amount.toString(),
        currency: "USD",
        issuedAt: now.toISOString(),
        status: "paid",
        paidAt: now.toISOString(),
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
  update: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if email is already used by another user
      if (input.email) {
        const existing = await getUserByEmail(input.email);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }
      await updateUserProfile(ctx.user.id, {
        name: input.name,
        email: input.email,
      });
      return { success: true };
    }),
  changePassword: protectedProcedure
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

  // ─── Users Management ───────────────────────
  listAllUsers: protectedProcedure
    .query(async ({ ctx }) => {
      assertAdminAccess(ctx, "profile.listAllUsers");
      return getAllUsers();
    }),

  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "profile.updateUserRole");
      assertNotSelfAdminTarget(ctx, input.userId, "update_role");
      return updateUserRole(input.userId, input.role);
    }),

  deleteUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "profile.deleteUser");
      assertNotSelfAdminTarget(ctx, input.userId, "delete_user");
      try {
        await deleteUserCascade(
          input.userId,
          cascadeAuditFromTrpc(ctx, "profile.deleteUser", "delete_user")
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
        const { notifyOwner } = await import("./_core/notification");
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

        // Secondary: Forge owner notification — must not fail the contact form.
        try {
          const forgeDelivered = await notifyOwner({
            title: `رسالة جديدة من ${input.name}`,
            content: `الموضوع: ${input.subject}\n\n${input.message.substring(0, 200)}${input.message.length > 200 ? '...' : ''}`,
          });
          if (!forgeDelivered) {
            console.warn(
              "[Contact] Forge owner notification not delivered (email succeeded)",
              { subject: input.subject, fromEmail: input.email }
            );
          }
        } catch (notifyError) {
          console.warn(
            "[Contact] Forge owner notification failed (email succeeded, non-fatal):",
            notifyError
          );
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

  create: protectedProcedure
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

  update: protectedProcedure
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

  delete: protectedProcedure
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
  create: protectedProcedure
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
  createMultiple: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      count: z.number().min(1).max(500),
      startFrom: z.number().min(1).default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return createMultipleTables(input.restaurantId, input.count, input.startFrom);
    }),
  update: protectedProcedure
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
  delete: protectedProcedure
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

// ─── Order Router ────────────────────────────────────────────
const orderRouter = router({
  // Public: check if ordering is enabled for this restaurant
  canOrder: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      const canOrder = await restaurantAllowsTableOrdering(input.restaurantId);
      return { canOrder };
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
        nameAr: z.string(),
        nameEn: z.string().nullish(),
        price: z.string(),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().nullish(),
      })).min(1),
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

      const allowsOrdering = await restaurantAllowsTableOrdering(input.restaurantId);
      if (!allowsOrdering) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ميزة الطلب عبر المنيو متاحة فقط للمشتركين في الخطة الاحترافية أو المؤسسية' });
      }

      const table = await getTableByRestaurantAndNumber(input.restaurantId, input.tableNumber);
      if (!table) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
      }

      const { items } = input;
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      const orderNumber = await generateOrderNumber(input.restaurantId);
      const result = await createOrder({
        restaurantId: input.restaurantId,
        tableId: table.id,
        tableNumber: table.tableNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
        totalAmount: totalAmount.toFixed(2),
        orderNumber,
      }) as { id: number } | null;
      if (result) {
        await createOrderItems(items.map(item => ({
          orderId: result.id,
          menuItemId: item.menuItemId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
        })));
        // Send notification to restaurant owner
        try {
          const itemsSummary = items.map(i => `${i.nameAr} x${i.quantity}`).join('، ');
          await createNotification({
            userId: restaurant.userId,
            notificationType: 'new_order',
            message: `طلب جديد #${orderNumber} - طاولة ${table.tableNumber} - ${itemsSummary} - المجموع: ${totalAmount.toFixed(2)} ${restaurant.currencySymbol || 'ر.س'}`,
            isRead: false,
            isSent: true,
            sentAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          });
        } catch (e) { /* notification failure is non-critical */ }
      }
      return { orderId: result?.id, orderNumber };
    }),
  // Protected: list orders for restaurant owner
  list: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      status: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return getOrdersWithItemsByRestaurant(input.restaurantId, input.status);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const order = await getOrderById(input.id);
      if (!order) return null;
      await assertRestaurantAccess(ctx, order.restaurantId);
      const items = await getOrderItemsByOrderId(input.id);
      return { ...order, items };
    }),
  updateStatus: protectedProcedure
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
      await updateOrderStatus(input.id, input.status);
      return { success: true };
    }),
  activeCount: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      return getActiveOrdersCount(input.restaurantId);
    }),
  // Public: get order status (for customer tracking)
  trackOrder: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      // Simple tracking by order number
      return null; // Will implement later if needed
    }),
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
  invoice: invoiceRouter,
  notification: notificationRouter,
  countryCurrency: countryCurrencyRouter,
  admin: adminRouter,
  profile: profileRouter,
  publicStats: publicStatsRouter,
  contact: contactRouter,
  holiday: holidayRouter,
  table: tableRouter,
  order: orderRouter,
});
export type AppRouter = typeof appRouter;
