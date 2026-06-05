import { TRPCError } from "@trpc/server";
import type { InsertUserSubscription } from "../drizzle/schema";
import {
  getRestaurantById,
  getRestaurantsByUser,
  getSubscriptionById,
  getUserByEmail,
  getUserById,
} from "./db";

export const ADMIN_TRIAL_DAYS = 14;

type BillingCycle = "monthly" | "yearly";
type SubscriptionStatus = "active" | "canceled" | "expired" | "trial";

/** Period end for admin-created subscriptions (trial defaults to 14 days). */
export function computeAdminSubscriptionPeriodEnd(params: {
  billingCycle: BillingCycle;
  subscriptionEndDate?: string;
  status?: SubscriptionStatus;
}): Date {
  if (params.subscriptionEndDate) {
    return new Date(params.subscriptionEndDate);
  }
  const periodEnd = new Date();
  if (params.status === "trial") {
    periodEnd.setDate(periodEnd.getDate() + ADMIN_TRIAL_DAYS);
  } else if (params.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  return periodEnd;
}

/** Ensures trial rows always carry trialEndsAt aligned with currentPeriodEnd. */
export function buildAdminSubscriptionInsert(
  params: {
    userId: number;
    restaurantId: number;
    planId: number;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    subscriptionEndDate?: string;
  },
  now: Date = new Date()
): InsertUserSubscription {
  const periodEnd = computeAdminSubscriptionPeriodEnd(params);
  const payload: InsertUserSubscription = {
    userId: params.userId,
    restaurantId: params.restaurantId,
    planId: params.planId,
    status: params.status,
    billingCycle: params.billingCycle,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
  };
  if (params.status === "trial") {
    payload.trialEndsAt = periodEnd.toISOString();
  }
  return payload;
}

/** When admin sets status to trial, populate trialEndsAt (and period end if omitted). */
export function applyAdminTrialStatusUpdate(
  updateData: Record<string, unknown>,
  input: { status?: SubscriptionStatus; subscriptionEndDate?: string }
): void {
  if (input.status !== "trial") return;

  const trialEnd = input.subscriptionEndDate
    ? new Date(input.subscriptionEndDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + ADMIN_TRIAL_DAYS);
        return d;
      })();

  updateData.trialEndsAt = trialEnd.toISOString();
  if (!input.subscriptionEndDate) {
    updateData.currentPeriodEnd = trialEnd.toISOString();
  }
}

/**
 * Resolve restaurant scope for user-level admin subscription creation.
 * Requires explicit restaurantId when the user owns restaurants.
 */
export async function resolveSubscriptionRestaurantIdForUser(
  userId: number,
  restaurantIdInput: number | undefined
): Promise<number> {
  if (restaurantIdInput !== undefined) {
    if (restaurantIdInput === 0) {
      const owned = await getRestaurantsByUser(userId);
      if (owned.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب تحديد المطعم عند وجود مطاعم مرتبطة بالمستخدم",
        });
      }
      return 0;
    }

    const restaurant = await getRestaurantById(restaurantIdInput);
    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
    }
    if (restaurant.userId !== userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "المطعم لا يتبع هذا المستخدم",
      });
    }
    return restaurantIdInput;
  }

  const owned = await getRestaurantsByUser(userId);
  if (owned.length === 0) {
    return 0;
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "يجب تحديد المطعم لإنشاء الاشتراك",
  });
}

/** Owner userId for restaurant-scoped admin subscription creation. */
export async function resolveRestaurantOwnerUserId(
  restaurantId: number,
  userIdOverride: number | undefined
): Promise<number> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
  }
  if (userIdOverride !== undefined && userIdOverride !== restaurant.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "معرف المستخدم لا يطابق مالك المطعم",
    });
  }
  return restaurant.userId;
}

/**
 * Resolve restaurant owner for admin-created restaurants (ADMIN-AUDIT-FIX-2).
 * Prefers explicit ownerUserId, then ownerEmail lookup; falls back to admin caller.
 */
export async function resolveAdminRestaurantOwnerUserId(params: {
  ownerUserId?: number;
  ownerEmail?: string;
  adminUserId: number;
}): Promise<number> {
  if (params.ownerUserId !== undefined) {
    const user = await getUserById(params.ownerUserId);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم المستهدف غير موجود" });
    }
    return params.ownerUserId;
  }

  if (params.ownerEmail) {
    const user = await getUserByEmail(params.ownerEmail);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "لم يتم العثور على حساب المشترك لهذا البريد الإلكتروني",
      });
    }
    return user.id;
  }

  return params.adminUserId;
}

/** Load and validate a restaurant-scoped subscription before admin update (ADMIN-AUDIT-FIX-2). */
export async function assertRestaurantSubscriptionForUpdate(
  subscriptionId: number
): Promise<{ id: number; userId: number; restaurantId: number }> {
  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الاشتراك غير موجود" });
  }

  if (sub.restaurantId > 0) {
    const restaurant = await getRestaurantById(sub.restaurantId);
    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "المطعم المرتبط بالاشتراك غير موجود" });
    }
    if (restaurant.userId !== sub.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "الاشتراك لا يتطابق مع مالك المطعم",
      });
    }
  }

  return { id: sub.id, userId: sub.userId, restaurantId: sub.restaurantId };
}

/** Trial subscriptions are not billable via admin invoice generation (ADMIN-AUDIT-FIX-1, LAUNCH-5B). */
export function assertSubscriptionEligibleForAdminInvoice(
  status: SubscriptionStatus
): void {
  if (status === "trial") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "لا يمكن إنشاء فاتورة لاشتراك تجريبي. الاشتراكات التجريبية غير قابلة للفوترة.",
    });
  }
}
