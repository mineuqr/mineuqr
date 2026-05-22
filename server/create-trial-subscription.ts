import { createUserSubscription, getSubscriptionPlanById } from "./db";
import { InsertUserSubscription } from "../drizzle/schema";

/**
 * Create a 14-day trial subscription for a new user
 */
export async function createTrialSubscription(userId: number): Promise<void> {
  try {
    // Get the basic plan (usually the first plan)
    // For now, we'll use plan ID 1 (Basic Plan)
    const basicPlanId = 1;
    
    const now = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial
    
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14);

    const trialSubscription: InsertUserSubscription = {
      userId,
      restaurantId: 0, // Default restaurant ID for trial
      planId: basicPlanId,
      status: "trial",
      billingCycle: "monthly",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
    };

    await createUserSubscription(trialSubscription);
    console.log(`[Trial] Created 14-day trial subscription for user ${userId}`);
  } catch (error) {
    console.error("[Trial] Failed to create trial subscription:", error);
    throw error;
  }
}
