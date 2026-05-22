import { Request, Response } from "express";
import { capturePayPalOrder } from "./paypal";
import { getUserSubscription, updateUserSubscription, getSubscriptionPlanById, getUserByOpenId, getRestaurantsByUser } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendWelcomeEmail } from "./email";

export async function handlePayPalWebhook(req: Request, res: Response) {
  try {
    const event = req.body;

    // Handle checkout.order.completed event
    if (event.event_type === "checkout.order.completed") {
      const orderId = event.resource.id;
      const customData = event.resource.purchase_units?.[0]?.custom_id;

      if (!customData) {
        console.error("[PayPal Webhook] Missing custom_id in order");
        return res.json({ status: "error", message: "Missing custom_id" });
      }

      const { userId, planId } = JSON.parse(customData);

      // Capture the order
      const capturedOrder = await capturePayPalOrder({ orderId });

      if (capturedOrder.status === "COMPLETED") {
        // Update user subscription
        const plan = await getSubscriptionPlanById(planId);
        if (!plan) {
          console.error("[PayPal Webhook] Plan not found:", planId);
          return res.json({ status: "error", message: "Plan not found" });
        }

        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await updateUserSubscription(userId, {
          planId,
          status: "active",
          stripeSubscriptionId: orderId,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          trialEndsAt: null,
        });

        // Send notification to owner
        await notifyOwner({
          title: "✅ اشتراك جديد",
          content: `المستخدم ${userId} اشترك في الخطة: ${plan.nameAr}`,
        });

        // Send welcome email to user
        try {
          const restaurants = await getRestaurantsByUser(userId);
          const restaurantName = restaurants?.[0]?.nameAr || "مطعمك";

          // Note: Email sending would require fetching user email from database
          // For now, we'll just log the action
          console.log(`[PayPal Webhook] Welcome email would be sent for restaurant: ${restaurantName}`);
        } catch (emailError) {
          console.warn("[PayPal Webhook] Failed to process welcome email:", emailError);
        }

        console.log("[PayPal Webhook] Subscription activated for user:", userId);
        return res.json({ status: "success" });
      }
    }

    return res.json({ status: "received" });
  } catch (error) {
    console.error("[PayPal Webhook] Error:", error);
    return res.status(500).json({ status: "error", message: String(error) });
  }
}
