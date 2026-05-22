import type { Request, Response } from "express";
import { retrieveTapCharge } from "./tap-payments";
import {
  updateSubscriptionById,
  updateUserSubscription,
  getUserById,
  getSubscriptionPlanById,
} from "./db";
import { notifyOwnerNewSubscription } from "./owner-email-notifications";

export async function handleTapWebhook(req: Request, res: Response) {
  try {
    const body = req.body;
    console.log("[Tap Webhook] Received event:", JSON.stringify(body).substring(0, 200));

    // Tap sends the charge ID in the webhook payload
    const chargeId = body?.id;
    if (!chargeId) {
      console.log("[Tap Webhook] No charge ID found in payload");
      return res.status(400).json({ error: "Missing charge ID" });
    }

    // Retrieve the full charge details from Tap API
    const charge = await retrieveTapCharge(chargeId);
    console.log("[Tap Webhook] Charge status:", charge.status, "ID:", charge.id);

    if (charge.status === "CAPTURED") {
      // Payment successful
      const metadata = charge.metadata || {};
      const userId = metadata.user_id;
      const subscriptionId = metadata.subscription_id;
      const billingCycle = metadata.billing_cycle;

      if (subscriptionId) {
        const subId = parseInt(subscriptionId);
        if (!isNaN(subId)) {
          const now = new Date();
          const endDate = new Date(now);
          if (billingCycle === "yearly") {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          await updateSubscriptionById(subId, {
            status: "active",
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: endDate.toISOString(),
          });

          console.log(
            `[Tap Webhook] Subscription ${subscriptionId} activated for user ${userId}`
          );
        }
      } else if (userId) {
        // Update by user ID if no subscription ID
        const uid = parseInt(userId);
        if (!isNaN(uid)) {
          const now = new Date();
          const endDate = new Date(now);
          if (billingCycle === "yearly") {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          await updateUserSubscription(uid, {
            status: "active",
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: endDate.toISOString(),
          });

          console.log(
            `[Tap Webhook] Subscription activated for user ${userId}`
          );
        }
      }

      // Send email notification to owner about new subscription
      try {
        const uid = userId ? parseInt(userId) : null;
        let userName = null;
        let userEmail = null;
        let planName = "غير محدد";
        if (uid) {
          const user = await getUserById(uid);
          if (user) {
            userName = user.name;
            userEmail = user.email;
          }
        }
        const planId = metadata.plan_id;
        if (planId) {
          const plan = await getSubscriptionPlanById(parseInt(planId));
          if (plan) planName = plan.nameAr;
        }
        await notifyOwnerNewSubscription({
          userName,
          userEmail,
          planName,
          billingCycle: billingCycle || "monthly",
          amount: charge.amount ? `${charge.amount} ${charge.currency || 'USD'}` : "غير محدد",
        });
      } catch (e) {
        console.error("[Tap Webhook] Failed to send email notification:", e);
      }

      return res.json({ received: true, status: "captured" });
    } else if (charge.status === "FAILED" || charge.status === "DECLINED") {
      console.log(`[Tap Webhook] Payment failed/declined: ${charge.id}`);
      return res.json({ received: true, status: charge.status.toLowerCase() });
    }

    // For other statuses (INITIATED, etc.)
    return res.json({ received: true, status: charge.status?.toLowerCase() });
  } catch (error) {
    console.error("[Tap Webhook] Error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
