import { clearSessionCookie } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, verifiedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getRestaurantsByUser, getRestaurantById, getRestaurantBySlug,
  createRestaurant, updateRestaurant, incrementViewCount,
  getCategoriesByRestaurant, getCategoryById, updateCategory, deleteCategory,
  getMenuItemsByCategory, getMenuItemsByRestaurant, getMenuItemById,
  updateMenuItem, deleteMenuItem, getRestaurantStats,
  createUserSubscription, getCanonicalUserSubscription,
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
import { requireRestaurantPlanFeature } from "./subscription-runtime";
import {
  createCategoryWithCommercialLimit,
  createMenuItemWithCommercialLimit,
  createRestaurantWithCommercialLimit,
} from "./subscriptionPlanLimits";
import { assertAdminAccess, assertNotSelfAdminTarget } from "./_core/assertAdminAccess";
import {
  assertSubscriptionEligibleForAdminInvoice,
  resolveAdminRestaurantOwnerUserId,
} from "./adminSubscriptionHelpers";
import {
  getOwnerAccountSubscriptionRow,
} from "./commercial/ownerAccountSubscriptionAuthority";
import { livePlanUuidInput } from "./services/commercial-catalog/adoptionService";
import { ownerAccessRouter } from "./platform-owner-access";
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
import { applyAdminUserSubscriptionReactivate } from "./commercial/adminReactivation";
import {
  applyAdminConcessionCancel,
  applyAdminConcessionGrant,
  applyAdminConcessionRead,
  applyAdminConcessionRevise,
} from "./commercial/adminConcessions";
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
import { realtimePlatformRouter } from "./realtime-platform/realtimePlatformRouter";
import { commercialCatalogRouter } from "./api/commercialCatalog";
import { ENV } from "./_core/env";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { markPaid, markComplimentary, closeSession } from "./diningSession/sessionService";
import {
  activateCashierHandoffForOrder,
  activateCashierHandoffForSession,
} from "./pos/cashier-handoff/CashierHandoffService";
import { resolveOperationalSession } from "./operational-session";
import {
  findActiveSession,
  findSessionById,
} from "./diningSession/sessionRepository";
import { SESSION_TOKEN_PATTERN } from "./diningSession/sessionPublicStatus";
import { throwSessionServiceTrpcError } from "./diningSession/mapSessionErrorToTrpc";
import {
  getPublicActiveSessionByTable,
  getPublicSessionByToken,
} from "./diningSession/sessionRecoveryService";
import { getOwnerSessionTimeline } from "./diningSession/sessionOwnerTimeline";
import { getOwnerSessionWorkspace } from "./diningSession/sessionOwnerWorkspace";
import {
  getWaiterTableWorkspace,
  listWaiterFloorTables,
} from "./operational-device/services/WaiterTableWorkspaceService";
import { opsRouter } from "./ops/opsRouter";
import { reportingRouter } from "./reporting-platform";
import { kitchenRouter } from "./kitchen/read/kitchenRouter";
import { orderReadRouter } from "./order/read/orderReadRouter";
import { orderSettlementReadRouter } from "./operational-session/check/api/orderSettlementReadRouter";
import { settlementRecordReadRouter } from "./operational-session/check/api/settlementRecordReadRouter";
import { checkRefundRouter } from "./operational-session/check/api/checkRefundRouter";
import { splitPaymentReadRouter } from "./operational-session/check/api/splitPaymentReadRouter";
import { multiCheckAllocationRouter } from "./operational-session/check/api/multiCheckAllocationRouter";
import { crmpRouter } from "./crmp/api/crmpRouter";
import { listSettlementRecordsForSession } from "./operational-session/check/settlementRecordRepository";
import {
  settleOrderPaid,
  SettleOrderPaidError,
} from "./order/application/SettleOrderPaidService";
import {
  cancelCounterPickupUnpaid,
  listUnpaidCounterPickupChecks,
  settleCounterPickupPaid,
  StaffCounterPickupError,
} from "./order/application/StaffCounterPickupSettlementService";
import { settlementRecordReadService } from "./operational-session/check/api/settlementRecordReadService";
import { runSettlementRecordRead } from "./operational-session/check/api/mapSettlementRecordApiError";
import { mapOrderDisplayIdentityFields } from "./order/read/presentation/mapOrderDisplayIdentity";
import { printWorkspaceRouter } from "./print-workspace/printWorkspaceRouter";
import { operationalDeviceRouter } from "./operational-device/operationalDeviceRouter";
import { posRouter } from "./pos/api/posRouter";
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
  completeCashierPosOperationalService,
} from "./order/composition";
import {
  identityPlaceOrderService,
  placeOrderService,
} from "./order/placeOrderComposition";
import { runOrderCommand } from "./order/application/mapOrderDomainError";
import { isCashierPosOrderingChannel } from "./order/application/cashierPosOrderLifecycle";
import { resolveOrderActorFromUser } from "./order/application/resolveOrderActor";
import {
  ORDERING_SERVICE_MODES,
  createDriveLaneFulfilmentAnchor,
  createPickupPointFulfilmentAnchor,
  createQueueFulfilmentAnchor,
  createStationFulfilmentAnchor,
  createTableFulfilmentAnchor,
  createTableOrderIdentity,
  deriveFulfilmentLabel,
  type OrderingFulfilmentAnchor,
  type OrderingServiceMode,
} from "@shared/ordering-platform/orderingIdentityContract";
import {
  ORDERING_CHANNEL_IDS,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingPlatformContracts";
import {
  createTableSessionAnchor,
  serializeBusinessTaxPolicyJson,
} from "@shared/operational-session";
import bcrypt from "bcryptjs";

const placeOrderItemInput = z.object({
  menuItemId: z.number(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().nullish(),
  /** ORDER-READ-MODIFIERS-PERSISTENCE-1 — display labels dual-written into Order Aggregate. */
  modifiers: z.array(z.string().max(120)).max(32).optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().nullish().optional(),
  price: z.string().optional(),
});

/** Channel-agnostic Fulfilment Anchor input (NON-TABLE-PLACE-ORDER-1 / KIOSK-IDENTITY-ADOPTION-1). */
const fulfilmentAnchorInput = z.discriminatedUnion("anchorType", [
  z.object({
    anchorType: z.literal("table"),
    tableId: z.number().int().positive(),
    tableNumber: z.number().int().positive(),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
  z.object({
    anchorType: z.literal("station"),
    stationId: z.string().min(1).max(128),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
  z.object({
    anchorType: z.literal("pickup_point"),
    pickupPointId: z.string().min(1).max(128),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
  z.object({
    anchorType: z.literal("queue"),
    queueId: z.string().min(1).max(128),
    ticketLabel: z.string().min(1).max(64),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
  z.object({
    anchorType: z.literal("drive_lane"),
    laneId: z.string().min(1).max(128),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
]);

function toFulfilmentAnchor(
  input: z.infer<typeof fulfilmentAnchorInput>
): OrderingFulfilmentAnchor {
  switch (input.anchorType) {
    case "table":
      return createTableFulfilmentAnchor(input);
    case "station":
      return createStationFulfilmentAnchor(input);
    case "pickup_point":
      return createPickupPointFulfilmentAnchor(input);
    case "queue":
      return createQueueFulfilmentAnchor(input);
    case "drive_lane":
      return createDriveLaneFulfilmentAnchor(input);
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

async function assertPublicOrderingRestaurant(restaurantId: number) {
  const restaurant = await getRestaurantById(restaurantId);
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
    restaurantId,
    new Date(),
    restaurant
  );
  if (!allowsOrdering) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "ميزة الطلب عبر المنيو متاحة فقط للمشتركين في الخطة الاحترافية أو المؤسسية",
    });
  }
  return restaurant;
}

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
      const result = await createRestaurantWithCommercialLimit({
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
      /** CHECK-MANAGEMENT-ARCHITECTURE-1 — Business Settings taxation. */
      taxEnabled: z.boolean().optional(),
      taxMode: z.enum(["inclusive", "exclusive"]).optional(),
      taxPolicy: z
        .object({
          version: z.number().int().positive().default(1),
          components: z.array(
            z.object({
              id: z.string().min(1),
              name: z.string().min(1),
              ratePercent: z.string().min(1),
            })
          ),
        })
        .optional(),
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
      const { id, taxPolicy, ...data } = input;
      await updateRestaurant(id, {
        ...data,
        ...(taxPolicy !== undefined
          ? { taxPolicyJson: serializeBusinessTaxPolicyJson(taxPolicy) }
          : {}),
      });
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

  /**
   * @deprecated REPORTING-CANONICAL-API-SUNSET-1 — Legacy catalog/visit stats surface.
   * Soft-sunset for KPI display. Canonical: `reporting.getCatalogStatsSummary`.
   * Still invalidated from Dashboard after catalog edits; no active useQuery found.
   */
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
      await requireRestaurantPlanFeature(input.id, "menuDesign");
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
      await requireRestaurantPlanFeature(input.id, "menuDesign");
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
      await requireRestaurantPlanFeature(input.id, "menuDesign");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuDesign");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuDesign");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuManagement");
      return createCategoryWithCommercialLimit(input);
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
      await requireRestaurantPlanFeature(category.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(category.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(category.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuManagement");

      // Relational tenant integrity: prevents cross-tenant category linkage on create.
      const category = await getCategoryById(input.categoryId);
      if (!category || category.restaurantId !== input.restaurantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
      }

      return createMenuItemWithCommercialLimit(input);
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
      await requireRestaurantPlanFeature(item.restaurantId, "menuManagement");

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
      await requireRestaurantPlanFeature(item.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(item.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(input.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(offer.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(offer.restaurantId, "menuManagement");
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
      await requireRestaurantPlanFeature(offer.restaurantId, "menuManagement");
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
    const {
      listPlansForSelectionLegacyShape,
    } = await import("./services/commercial-catalog");
    const adopted = await listPlansForSelectionLegacyShape();
    if (adopted.source === "catalog") {
      return adopted.plans;
    }
    return [];
  }),

  getCurrentSubscription: verifiedProcedure.query(async ({ ctx }) => {
    const subscription = await getCanonicalUserSubscription(ctx.user.id);
    if (!subscription) return null;
    const { resolveSubscriptionPlanView } = await import(
      "./services/commercial-catalog"
    );
    const plan = await resolveSubscriptionPlanView(subscription.planId);
    return { subscription, plan };
  }),

  getByRestaurant: verifiedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      const subscription = await getSubscriptionForRestaurant(input.restaurantId);
      if (!subscription) return null;
      const { resolveSubscriptionPlanView } = await import(
        "./services/commercial-catalog"
      );
      const plan = await resolveSubscriptionPlanView(subscription.planId);
      return { subscription, plan };
    }),

  checkTrialStatus: verifiedProcedure.query(async ({ ctx }) => {
    return resolveTrialStatusRead(ctx.user.id);
  }),

  createCheckoutSession: verifiedProcedure
    .input(z.object({
      planId: livePlanUuidInput,
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { resolveCheckoutOfferFromLivePlan } = await import(
        "./services/commercial-catalog"
      );
      const offer = await resolveCheckoutOfferFromLivePlan(
        input.planId,
        input.billingCycle
      );
      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const { createPayPalOrder } = await import("./paypal");
      const origin = ctx.req.headers.origin || "https://www.mineuqr.com";
      const returnUrl = `${origin}/subscription/success`;
      const cancelUrl = `${origin}/subscription/cancel`;

      const { orderId, checkoutUrl } = await createPayPalOrder({
        userId: ctx.user.id,
        planId: input.planId,
        planName: offer.commercialName,
        amount: offer.amount,
        currency: "USD",
        returnUrl,
        cancelUrl,
      });

      return { orderId, checkoutUrl };
    }),

  createTapCheckout: verifiedProcedure
    .input(z.object({
      planId: livePlanUuidInput,
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { resolveCheckoutOfferFromLivePlan } = await import(
        "./services/commercial-catalog"
      );
      const offer = await resolveCheckoutOfferFromLivePlan(
        input.planId,
        input.billingCycle
      );
      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const { createTapCharge } = await import("./tap-payments");
      const origin = ctx.req.headers.origin || "https://www.mineuqr.com";
      const successUrl = `${origin}/subscription/success?tap_id={tap_id}`;
      const postUrl = `${origin}/api/tap/webhook`;

      const amountNum = parseFloat(offer.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "السعر غير متوفر" });
      }

      // Get user subscription to include in metadata
      const userSub = await getCanonicalUserSubscription(ctx.user.id);

      const charge = await createTapCharge({
        amount: amountNum,
        currency: "SAR",
        description: `اشتراك ${offer.commercialName} - ${input.billingCycle === "yearly" ? "سنوي" : "شهري"}`,
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
      planId: livePlanUuidInput,
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
      planId: livePlanUuidInput.optional(),
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
      const stats = await getAdminStatistics();
      if (!stats) return null;
      const { canonicalMetricsService } = await import(
        "./commercial/metrics/CanonicalMetricsService"
      );
      const { mrr } = await canonicalMetricsService.getMRR();
      return { ...stats, totalRevenue: mrr };
    }),

  /**
   * @deprecated REPORTING-CANONICAL-API-SUNSET-1 + EXEC-6 — Legacy Reporting Surface.
   * Soft-sunset: no production client useQuery. Not restaurant Check Revenue.
   * Gap program: ADMIN-REPORTING-PLATFORM-ADOPTION.
   */
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
      planId: livePlanUuidInput,
      billingCycle: z.enum(["monthly", "yearly"]),
      subscriptionEndDate: z.string().optional(),
      status: z.enum(["active", "canceled", "expired", "trial"]).optional(),
      freePeriod: z
        .object({
          unit: z.enum(["day", "month"]),
          duration: z.number().int(),
          reason: z.string().min(1).max(512),
        })
        .optional(),
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
        freePeriod: input.freePeriod,
      });
      const { resolveLivePlanDisplayByPlanRef } = await import(
        "./services/commercial-catalog"
      );
      const plan = await resolveLivePlanDisplayByPlanRef(input.planId);
      const planName = plan?.nameAr || plan?.nameEn || "غير معروف";
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
      planId: livePlanUuidInput.optional(),
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
      const { resolveLivePlanDisplayByPlanRef } = await import(
        "./services/commercial-catalog"
      );
      const updatedPlan = input.planId
        ? await resolveLivePlanDisplayByPlanRef(input.planId)
        : null;
      const changes: string[] = [];
      if (updatedPlan) changes.push(`الباقة: ${updatedPlan.nameAr || updatedPlan.nameEn}`);
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
  getCommercialConcession: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.getCommercialConcession");
      return applyAdminConcessionRead({ userId: input.userId });
    }),
  grantCommercialConcession: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        unit: z.enum(["day", "month"]),
        duration: z.number().int(),
        reason: z.string().min(1).max(512),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.grantCommercialConcession");
      const row = await applyAdminConcessionGrant({
        ctx,
        userId: input.userId,
        unit: input.unit,
        duration: input.duration,
        reason: input.reason,
      });
      return { success: true as const, concessionId: row.id, endsAt: row.endsAt };
    }),
  reviseCommercialConcession: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        unit: z.enum(["day", "month"]),
        duration: z.number().int(),
        reason: z.string().min(1).max(512),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.reviseCommercialConcession");
      const row = await applyAdminConcessionRevise({
        ctx,
        userId: input.userId,
        unit: input.unit,
        duration: input.duration,
        reason: input.reason,
      });
      return { success: true as const, concessionId: row.id, endsAt: row.endsAt };
    }),
  cancelCommercialConcession: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string().min(1).max(512),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.cancelCommercialConcession");
      await applyAdminConcessionCancel({
        ctx,
        userId: input.userId,
        reason: input.reason,
      });
      return { success: true as const };
    }),
  reactivateUserSubscriptionByAdmin: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        planId: livePlanUuidInput,
        billingCycle: z.enum(["monthly", "yearly"]),
        reason: z.string().min(1).max(512),
        mode: z.enum(["paid", "free"]),
        subscriptionEndDate: z.string().optional(),
        freePeriod: z
          .object({
            unit: z.enum(["day", "month"]),
            duration: z.number().int(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.reactivateUserSubscriptionByAdmin");
      const result = await applyAdminUserSubscriptionReactivate({
        ctx,
        userId: input.userId,
        planId: input.planId,
        billingCycle: input.billingCycle,
        reason: input.reason,
        mode: input.mode,
        subscriptionEndDate: input.subscriptionEndDate,
        freePeriod: input.freePeriod,
      });
      return {
        success: true as const,
        changed: result.changed,
        subscriptionId: result.subscriptionId,
        mode: result.mode,
        snapshotId: result.snapshotId,
        concessionId: result.concessionId,
      };
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
      const { loadCurrentCommercialConcession } = await import("./commercial/concessions");
      const { loadCurrentChargedTermsSnapshot } = await import(
        "./commercial/chargedTermsSnapshots"
      );
      if (await loadCurrentCommercialConcession(sub.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن إنشاء فاتورة أثناء فترة مجانية نشطة.",
        });
      }
      const snapshot = await loadCurrentChargedTermsSnapshot(sub.id);
      if (!snapshot?.chargedAmount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لا توجد شروط تجارية مسجلة لهذا الاشتراك",
        });
      }
      const { resolveLivePlanDisplayByPlanRef } = await import(
        "./services/commercial-catalog"
      );
      const amount = snapshot.chargedAmount;
      const plan = await resolveLivePlanDisplayByPlanRef(sub.planId);
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
        planName: plan?.nameEn || plan?.nameAr || "غير معروف",
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
      await requireRestaurantPlanFeature(input.restaurantId, "smartQr");
      return getTablesByRestaurant(input.restaurantId);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const table = await getTableById(input.id);
      if (!table) return null;
      await assertRestaurantAccess(ctx, table.restaurantId);
      await requireRestaurantPlanFeature(table.restaurantId, "smartQr");
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
      await requireRestaurantPlanFeature(input.restaurantId, "smartQr");
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
      await requireRestaurantPlanFeature(input.restaurantId, "smartQr");
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
      await requireRestaurantPlanFeature(table.restaurantId, "smartQr");
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
      await requireRestaurantPlanFeature(table.restaurantId, "smartQr");
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
/**
 * WAITER-ORDERING-FOUNDATION-1 — staff channel orchestration APIs.
 * Owns restaurant/table access + Session Platform attach only.
 * Does not place orders or own session lifecycle.
 */
const waiterRouter = router({
  listRestaurants: protectedProcedure.query(async ({ ctx }) => {
    const restaurants = await getRestaurantsByUser(ctx.user.id);
    return restaurants.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      isActive: r.isActive,
    }));
  }),

  listFloorTables: protectedProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "waiter.listFloorTables");
      return listWaiterFloorTables(input.restaurantId);
    }),

  /** WAITER-TABLE-WORKSPACE-1 — session workspace from Order Read projections. */
  getTableWorkspace: protectedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        sessionId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "waiter.getTableWorkspace");
      return getWaiterTableWorkspace({
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
      });
    }),

  attachTable: protectedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        tableId: z.number().int().positive(),
        tableNumber: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "waiter.attachTable");
      const table = await getTableById(input.tableId);
      if (
        !table ||
        table.restaurantId !== input.restaurantId ||
        table.tableNumber !== input.tableNumber
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
      }

      try {
        const sessionResult = await resolveOperationalSession({
          restaurantId: input.restaurantId,
          anchor: createTableSessionAnchor({
            tableId: table.id,
            tableNumber: table.tableNumber,
          }),
        });

        if (!sessionResult.session) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "تعذر فتح جلسة الطاولة",
          });
        }

        return {
          restaurantId: input.restaurantId,
          tableId: table.id,
          tableNumber: table.tableNumber,
          sessionId: sessionResult.session.id,
          sessionToken: sessionResult.session.sessionToken,
          sessionStatus: sessionResult.session.status,
          created: sessionResult.created,
          persistence: sessionResult.persistence,
        };
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
});

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
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
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
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
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
        /**
         * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — optional operator tenders.
         * Omitted → DEFAULT_PAID_PAYMENT_METHOD ("other").
         * Single line may omit amount (domain fills Check grandTotal).
         * Multi-tender lines require amount on each line.
         */
        settlements: z
          .array(
            z.object({
              paymentMethod: z.enum([
                "cash",
                "card",
                "other",
                // Legacy brand codes (map to card in analytics/display).
                "mada",
                "visa",
                "mastercard",
                "apple_pay",
                "stc_pay",
                "bank_transfer",
              ]),
              amount: z.string().min(1).optional(),
            })
          )
          .min(1)
          .optional(),
        /** SETTLEMENT-CONTEXT-ADOPTION-1 — optional; settle remains fail-open. */
        registerId: z.string().min(1).max(128).optional(),
        deviceId: z.string().min(1).max(64).optional(),
        operationalScreenId: z.string().min(1).max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
      try {
        await markPaid({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          actorUserId: ctx.user.id,
          settlements: input.settlements,
          registerId: input.registerId,
          deviceId: input.deviceId,
          operationalScreenId: input.operationalScreenId,
        });
        const workspace = await getOwnerSessionWorkspace(
          input.restaurantId,
          input.sessionId
        );
        // SETTLEMENT-RECORD-UI-ADOPTION-1 — acknowledge published Settlement Record.
        const records = await listSettlementRecordsForSession({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
        });
        const latest = [...records].sort((a, b) => {
          const ta = Date.parse(a.settledAt ?? a.createdAt);
          const tb = Date.parse(b.settledAt ?? b.createdAt);
          return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        })[0];
        return {
          ...workspace,
          settlementRecordId: latest?.settlementRecordId ?? null,
        };
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),
  markComplimentary: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
        registerId: z.string().min(1).max(128).optional(),
        deviceId: z.string().min(1).max(64).optional(),
        operationalScreenId: z.string().min(1).max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId);
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
      try {
        await markComplimentary({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          actorUserId: ctx.user.id,
          registerId: input.registerId,
          deviceId: input.deviceId,
          operationalScreenId: input.operationalScreenId,
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
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
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
  sendToCashier: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        sessionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "session.sendToCashier");
      await requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement");
      try {
        return await activateCashierHandoffForSession({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
        });
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
  /**
   * Public: identity-driven place order (NON-TABLE-PLACE-ORDER-1).
   * Channel-agnostic — accepts Service Mode + Fulfilment Anchor.
   * Channels must not invent platform types; QR table path remains `order.create`.
   */
  placeWithIdentity: publicProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        serviceMode: z.enum(
          ORDERING_SERVICE_MODES as unknown as [
            (typeof ORDERING_SERVICE_MODES)[number],
            ...(typeof ORDERING_SERVICE_MODES)[number][],
          ]
        ),
        fulfilmentAnchor: fulfilmentAnchorInput,
        customerName: z.string().nullish(),
        customerPhone: z.string().nullish(),
        notes: z.string().nullish(),
        items: z.array(placeOrderItemInput).min(1),
        sessionToken: z
          .string()
          .min(16)
          .max(64)
          .regex(SESSION_TOKEN_PATTERN)
          .optional(),
        orderingChannel: z.enum(
          ORDERING_CHANNEL_IDS as unknown as [
            (typeof ORDERING_CHANNEL_IDS)[number],
            ...(typeof ORDERING_CHANNEL_IDS)[number][],
          ]
        ),
      })
    )
    .mutation(async ({ input }) => {
      await assertPublicOrderingRestaurant(input.restaurantId);

      const fulfilmentAnchor = toFulfilmentAnchor(input.fulfilmentAnchor);
      if (
        fulfilmentAnchor.anchorType === "table" &&
        !(await getTableByRestaurantAndNumber(
          input.restaurantId,
          fulfilmentAnchor.tableNumber
        ))
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
      }

      try {
        const placeResult = await runOrderCommand(
          () =>
            identityPlaceOrderService.execute({
              restaurantId: input.restaurantId,
              serviceMode: input.serviceMode as OrderingServiceMode,
              fulfilmentAnchor,
              sessionToken: input.sessionToken,
              orderingChannel: input.orderingChannel,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              notes: input.notes,
              items: input.items.map((item) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes,
                modifiers: item.modifiers,
              })),
            }),
          { awaitRelay: false }
        );

        return {
          orderId: placeResult.order.id,
          orderNumber: placeResult.orderNumber,
          trackingToken: placeResult.trackingToken,
          displayReference: placeResult.displayReference,
          fulfilmentLabel: deriveFulfilmentLabel(fulfilmentAnchor),
          tableNumber:
            fulfilmentAnchor.anchorType === "table"
              ? fulfilmentAnchor.tableNumber
              : placeResult.order.tableNumber,
          totalAmount: placeResult.totalAmount,
          itemCount: placeResult.itemCount,
          createdAt: placeResult.createdAt,
          status: "pending" as const,
          sessionPersistence: placeResult.sessionPersistence,
          ...(placeResult.identity.operationalSession.sessionToken
            ? { sessionToken: placeResult.identity.operationalSession.sessionToken }
            : {}),
        };
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),

  /**
   * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — public Order settle façade.
   * Resolves Check via membership → confirmPayment (certified Check settle pipeline).
   * Auth: trackingToken proves order ownership (same capability as public status).
   */
  settlePaid: publicProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
        trackingToken: z.string().min(8).max(128),
        settlements: z
          .array(
            z.object({
              paymentMethod: z.enum([
                "cash",
                "card",
                "other",
                "mada",
                "visa",
                "mastercard",
                "apple_pay",
                "stc_pay",
                "bank_transfer",
              ]),
              amount: z.string().min(1).optional(),
            })
          )
          .min(1)
          .optional(),
        /** SETTLEMENT-CONTEXT-ADOPTION-1 — optional station hints; settle fail-open. */
        registerId: z.string().min(1).max(128).optional(),
        deviceId: z.string().min(1).max(64).optional(),
        operatorUserId: z.number().int().positive().optional(),
        operationalScreenId: z.string().min(1).max(128).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await assertPublicOrderingRestaurant(input.restaurantId);
      try {
        return await settleOrderPaid({
          restaurantId: input.restaurantId,
          orderId: input.orderId,
          trackingToken: input.trackingToken,
          settlements: input.settlements,
          registerId: input.registerId,
          deviceId: input.deviceId,
          operatorUserId: input.operatorUserId,
          operationalScreenId: input.operationalScreenId,
        });
      } catch (err) {
        if (err instanceof SettleOrderPaidError) {
          if (
            err.code === "ORDER_NOT_FOUND" ||
            err.code === "CHECK_NOT_FOUND"
          ) {
            throw new TRPCError({ code: "NOT_FOUND", message: err.message });
          }
          if (err.code === "TRACKING_MISMATCH") {
            throw new TRPCError({ code: "FORBIDDEN", message: err.message });
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err.message,
          });
        }
        throwSessionServiceTrpcError(err);
      }
    }),

  /**
   * SELF-ORDERING-SETTLEMENT-ADOPTION-1 / RECEIPT-SR-IDENTITY-1
   * Public receipt: tracking token + order ownership gate.
   * Historical/refund: settlementRecordId → Settlement Record.
   * Current Cashier paid-sale: omit settlementRecordId → Collection Fact / orderId.
   * Existing URLs that send settlementRecordId stay valid.
   */
  getSettlementReceipt: publicProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
        trackingToken: z.string().min(8).max(128),
        settlementRecordId: z.string().min(1).max(128).optional().nullable(),
      })
    )
    .query(async ({ input }) => {
      await assertPublicOrderingRestaurant(input.restaurantId);
      const order = await getOrderById(input.orderId);
      if (!order || order.restaurantId !== input.restaurantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      if (
        !order.trackingToken ||
        order.trackingToken !== input.trackingToken
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Order tracking token mismatch",
        });
      }
      const settlementRecordId = input.settlementRecordId?.trim() ?? "";
      const receipt = await runSettlementRecordRead(() =>
        settlementRecordReadService.getReceipt(
          settlementRecordId.length > 0
            ? {
                restaurantId: input.restaurantId,
                settlementRecordId,
              }
            : {
                restaurantId: input.restaurantId,
                orderId: input.orderId,
              }
        )
      );
      if (!receipt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement Record not found",
        });
      }
      const onOrder = receipt.orders.some((o) => o.orderId === input.orderId);
      if (!onOrder) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Settlement does not include this order",
        });
      }
      return receipt;
    }),

  /**
   * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — unpaid sessionless Check queue.
   */
  listUnpaidCounterPickup: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        query: z.string().max(64).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "order.listUnpaidCounterPickup"
      );
      return listUnpaidCounterPickupChecks(input);
    }),

  /**
   * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — staff settle sessionless Check.
   * Requires active Register + open Financial Shift (CSA-03). No trackingToken.
   */
  staffSettleCounterPickup: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
        registerId: z.string().min(1).max(128),
        settlements: z
          .array(
            z.object({
              paymentMethod: z.enum([
                "cash",
                "card",
                "other",
                "mada",
                "visa",
                "mastercard",
                "apple_pay",
                "stc_pay",
                "bank_transfer",
              ]),
              amount: z.string().min(1).optional(),
            })
          )
          .min(1)
          .optional(),
        deviceId: z.string().min(1).max(64).optional(),
        operationalScreenId: z.string().min(1).max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "order.staffSettleCounterPickup"
      );
      try {
        return await settleCounterPickupPaid({
          restaurantId: input.restaurantId,
          orderId: input.orderId,
          operatorUserId: ctx.user.id,
          registerId: input.registerId,
          settlements: input.settlements,
          deviceId: input.deviceId,
          operationalScreenId: input.operationalScreenId,
        });
      } catch (err) {
        if (err instanceof StaffCounterPickupError) {
          if (
            err.code === "ORDER_NOT_FOUND" ||
            err.code === "CHECK_NOT_FOUND"
          ) {
            throw new TRPCError({ code: "NOT_FOUND", message: err.message });
          }
          if (
            err.code === "REGISTER_REQUIRED" ||
            err.code === "SHIFT_REQUIRED"
          ) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: err.message,
            });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throwSessionServiceTrpcError(err);
      }
    }),

  /**
   * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — void unpaid Check + cancel Order.
   */
  staffCancelCounterPickup: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
        registerId: z.string().min(1).max(128).optional(),
        reason: z.string().max(256).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "order.staffCancelCounterPickup"
      );
      const order = await getOrderById(input.orderId);
      if (!order || order.restaurantId !== input.restaurantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      const restaurant = await getRestaurantById(input.restaurantId);
      const actor = resolveOrderActorFromUser(
        ctx.user,
        input.restaurantId,
        restaurant?.userId ?? ctx.user.id
      );
      try {
        return await cancelCounterPickupUnpaid({
          restaurantId: input.restaurantId,
          orderId: input.orderId,
          operatorUserId: ctx.user.id,
          actor,
          registerId: input.registerId,
          reason: input.reason,
        });
      } catch (err) {
        if (err instanceof StaffCounterPickupError) {
          if (
            err.code === "ORDER_NOT_FOUND" ||
            err.code === "CHECK_NOT_FOUND"
          ) {
            throw new TRPCError({ code: "NOT_FOUND", message: err.message });
          }
          if (err.code === "ALREADY_SETTLED") {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: err.message,
            });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throwSessionServiceTrpcError(err);
      }
    }),

  /**
   * WAITER-ORDERING-FOUNDATION-1 — authenticated staff place path.
   * Wraps IdentityPlaceOrderService; forces Business Identity scope WAITER.
   * Requires restaurant access + existing/resolvable table session token.
   */
  placeAsWaiter: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number(),
        serviceMode: z.literal("table_service"),
        fulfilmentAnchor: z.object({
          anchorType: z.literal("table"),
          tableId: z.number().int().positive(),
          tableNumber: z.number().int().positive(),
          fulfilmentLabel: z.string().min(1).max(64).optional(),
        }),
        customerName: z.string().nullish(),
        customerPhone: z.string().nullish(),
        notes: z.string().nullish(),
        items: z.array(placeOrderItemInput).min(1),
        sessionToken: z
          .string()
          .min(16)
          .max(64)
          .regex(SESSION_TOKEN_PATTERN),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "order.placeAsWaiter");
      await assertPublicOrderingRestaurant(input.restaurantId);

      const fulfilmentAnchor = createTableFulfilmentAnchor(input.fulfilmentAnchor);
      const table = await getTableByRestaurantAndNumber(
        input.restaurantId,
        fulfilmentAnchor.tableNumber
      );
      if (!table || table.id !== fulfilmentAnchor.tableId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
      }

      try {
        const placeResult = await runOrderCommand(
          () =>
            identityPlaceOrderService.execute({
              restaurantId: input.restaurantId,
              serviceMode: "table_service",
              fulfilmentAnchor,
              sessionToken: input.sessionToken,
              identityScope: "WAITER",
              orderingChannel: ORDERING_CHANNEL_WAITER_TABLET,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              notes: input.notes,
              items: input.items.map((item) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes,
                modifiers: item.modifiers,
              })),
            }),
          { awaitRelay: false }
        );

        if (!placeResult.identity.operationalSession.sessionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "يجب ربط الطلب بجلسة المطعم",
          });
        }

        return {
          orderId: placeResult.order.id,
          orderNumber: placeResult.orderNumber,
          trackingToken: placeResult.trackingToken,
          displayReference: placeResult.displayReference,
          fulfilmentLabel: deriveFulfilmentLabel(fulfilmentAnchor),
          tableNumber: fulfilmentAnchor.tableNumber,
          totalAmount: placeResult.totalAmount,
          itemCount: placeResult.itemCount,
          createdAt: placeResult.createdAt,
          status: "pending" as const,
          sessionPersistence: placeResult.sessionPersistence,
          sessionToken: placeResult.identity.operationalSession.sessionToken,
        };
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
    }),

  // Public: create order (no auth needed) — QR table path (unchanged).
  create: publicProcedure
    .input(z.object({
      restaurantId: z.number(),
      tableId: z.number(),
      tableNumber: z.number().int().min(1),
      customerName: z.string().nullish(),
      customerPhone: z.string().nullish(),
      notes: z.string().nullish(),
      items: z.array(placeOrderItemInput).min(1),
      sessionToken: z
        .string()
        .min(16)
        .max(64)
        .regex(SESSION_TOKEN_PATTERN)
        .optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const {
        withOrderLifecycleLatency,
        markOrderLifecycleLatency,
        noteOrderLifecyclePhase,
        noteOrderLifecycleMeta,
        timeOrderLifecyclePhase,
        getOrderLifecycleLatencyContext,
      } = await import("./order/observability/orderLifecycleLatency");
      const { createOrderLifecycleTraceId } = await import(
        "@shared/order-lifecycle-latency"
      );

      return withOrderLifecycleLatency(
        {
          traceId: ctx.correlationId ?? createOrderLifecycleTraceId(),
          restaurantId: input.restaurantId,
          transition: "place",
          surface: "order.create",
        },
        async () => {
          noteOrderLifecycleMeta(
            "program",
            "ORDER-SUBMISSION-LATENCY-INSTRUMENTATION-1"
          );

          const restaurant = await timeOrderLifecyclePhase("auth_ms", () =>
            assertPublicOrderingRestaurant(input.restaurantId)
          );
          markOrderLifecycleLatency("authz");

          const table = await timeOrderLifecyclePhase("table_ms", () =>
            getTableByRestaurantAndNumber(input.restaurantId, input.tableNumber)
          );
          if (!table) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
          }

          let sessionId: number | undefined;
          let sessionToken: string | undefined;
          if (ENV.tableSessionDualWrite) {
            await timeOrderLifecyclePhase("session_ms", async () => {
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
                  tableContext: { restaurant, table },
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
            });
          } else {
            noteOrderLifecyclePhase("session_ms", 0);
            noteOrderLifecycleMeta("session_skipped", true);
          }

          // ORDER-IDENTITY-RUNTIME-1 — table ordering as Fulfilment Anchor type `table`.
          const orderIdentity = createTableOrderIdentity({
            tableId: table.id,
            tableNumber: table.tableNumber,
            sessionId: ENV.tableSessionDualWrite && sessionId != null ? sessionId : null,
            sessionToken:
              ENV.tableSessionDualWrite && sessionToken != null ? sessionToken : null,
          });

          const placeResult = await runOrderCommand(
            () =>
              placeOrderService.execute({
                restaurantId: input.restaurantId,
                identity: orderIdentity,
                tableId: table.id,
                tableNumber: table.tableNumber,
                ...(ENV.tableSessionDualWrite && sessionId != null
                  ? { sessionId }
                  : {}),
                orderingChannel: ORDERING_CHANNEL_QR,
                customerName: input.customerName,
                customerPhone: input.customerPhone,
                notes: input.notes,
                items: input.items.map((item) => ({
                  menuItemId: item.menuItemId,
                  quantity: item.quantity,
                  notes: item.notes,
                  modifiers: item.modifiers,
                })),
              }),
            { awaitRelay: false }
          );

          const latency = getOrderLifecycleLatencyContext();
          if (latency && placeResult.order.id != null) {
            latency.orderId = placeResult.order.id;
          }

          return {
            orderId: placeResult.order.id,
            orderNumber: placeResult.orderNumber,
            trackingToken: placeResult.trackingToken,
            displayReference: placeResult.displayReference,
            tableNumber: table.tableNumber,
            totalAmount: placeResult.totalAmount,
            itemCount: placeResult.itemCount,
            createdAt: placeResult.createdAt,
            status: "pending" as const,
            ...(ENV.tableSessionDualWrite && sessionToken
              ? { sessionToken }
              : {}),
          };
        }
      );
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
  sendToCashier: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        orderId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "order.sendToCashier");
      try {
        return await activateCashierHandoffForOrder({
          restaurantId: input.restaurantId,
          orderId: input.orderId,
        });
      } catch (err) {
        throwSessionServiceTrpcError(err);
      }
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

      const { withOrderLifecycleLatency, markOrderLifecycleLatency } = await import(
        "./order/observability/orderLifecycleLatency"
      );
      const { createOrderLifecycleTraceId } = await import(
        "@shared/order-lifecycle-latency"
      );

      return withOrderLifecycleLatency(
        {
          traceId: ctx.correlationId ?? createOrderLifecycleTraceId(),
          orderId: input.id,
          restaurantId: order.restaurantId,
          transition: `${order.status}->${input.status}`,
          previousStatus: order.status,
          surface: "order.updateStatus",
        },
        async () => {
          markOrderLifecycleLatency("authz");
          const result = await runOrderCommand(
            async () => {
              if (
                input.status === "served" &&
                isCashierPosOrderingChannel(order.orderingChannel)
              ) {
                return completeCashierPosOperationalService.execute({
                  orderId: input.id,
                  restaurantId: order.restaurantId,
                  sessionId: order.sessionId,
                  orderingChannel: order.orderingChannel,
                  currentStatus: order.status,
                  actor,
                });
              }
              return advanceOrderStatusService.execute({
                orderId: input.id,
                targetStatus: input.status,
                actor,
              });
            },
            { awaitRelay: false }
          );

          return {
            success: true,
            orderId: input.id,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
          };
        }
      );
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
          businessDay: row.businessDay ?? null,
          dailyDisplayNumber: row.dailyDisplayNumber ?? null,
          identityScope: row.identityScope ?? null,
          serviceMode: row.serviceMode ?? null,
          fulfilmentAnchorType: row.fulfilmentAnchorType ?? null,
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
  realtime: realtimePlatformRouter,
  commercialCatalog: commercialCatalogRouter,
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
  ownerAccess: ownerAccessRouter,
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
  waiter: waiterRouter,
  order: orderRouter,
  ordering: orderingRouter,
  ops: opsRouter,
  reporting: reportingRouter,
  kitchen: kitchenRouter,
  orderSettlement: orderSettlementReadRouter,
  settlementRecord: settlementRecordReadRouter,
  checkRefund: checkRefundRouter,
  splitPayment: splitPaymentReadRouter,
  multiCheckAllocation: multiCheckAllocationRouter,
  crmp: crmpRouter,
  printWorkspace: printWorkspaceRouter,
  operationalDevice: operationalDeviceRouter,
  pos: posRouter,
  printConnector: printConnectorRouter,
  printerManagement: printerManagementRouter,
});
export type AppRouter = typeof appRouter;
