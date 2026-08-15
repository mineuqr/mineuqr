import { Request, Response } from "express";
import { capturePayPalOrder } from "./paypal";
import {
  getRestaurantsByUser,
  getUserById,
  updateSubscriptionForActivation,
} from "./db";
import { notifyOwnerNewSubscription } from "./owner-email-notifications";
import { sendWelcomeEmail } from "./email";
import { getCorrelationId } from "./_core/requestContext";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { noteWebhookEvent } from "./_core/webhookDedup";
import { ensureLivePlanBoundForSubscription } from "./services/commercial-catalog";

export async function handlePayPalWebhook(req: Request, res: Response) {
  const correlationId = getCorrelationId(req);
  const provider = "paypal" as const;
  const method = req.method;
  const route = req.path;

  try {
    const event = req.body;
    const eventType = event?.event_type ? String(event.event_type) : "unknown";
    const orderId = event?.resource?.id ? String(event.resource.id) : "";

    opsLog({
      type: OPS_EVENT.webhook_received,
      category: "WEBHOOK",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: {
        provider,
        providerEventId: orderId || undefined,
        eventType,
      },
    });

    // Handle checkout.order.completed event
    if (event.event_type === "checkout.order.completed") {
      const customData = event.resource.purchase_units?.[0]?.custom_id;

      if (!customData) {
        opsLog({
          type: OPS_EVENT.webhook_processing_failed,
          category: "WEBHOOK",
          severity: "warn",
          ts: new Date().toISOString(),
          correlationId,
          route,
          method,
          metadata: { provider, providerEventId: orderId || undefined, eventType, reason: "missing_custom_id" },
        });
        return res.json({ status: "error", message: "Missing custom_id" });
      }

      const { userId, planId } = JSON.parse(customData);

      if (orderId) {
        noteWebhookEvent({
          provider,
          providerEventId: orderId,
          correlationId,
          route,
          method,
          eventType,
        });
      }

      opsLog({
        type: OPS_EVENT.webhook_processing_started,
        category: "WEBHOOK",
        severity: "info",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        metadata: { provider, providerEventId: orderId || undefined, eventType, userId, planId },
      });

      // Capture the order
      const capturedOrder = await capturePayPalOrder({ orderId });

      if (capturedOrder.status === "COMPLETED") {
        // Update user subscription
        const {
          parseWebhookPlanRef,
          resolveLivePlanDisplayByPlanRef,
          resolveCanonicalLivePlanId,
          resolveLegacyPlanIdFromPlan,
        } = await import("./services/commercial-catalog");
        const planRef = parseWebhookPlanRef(planId);
        if (planRef == null) {
          opsLog({
            type: OPS_EVENT.webhook_processing_failed,
            category: "WEBHOOK",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: { provider, providerEventId: orderId, eventType, reason: "plan_not_found", planId },
          });
          return res.json({ status: "error", message: "Plan not found" });
        }
        let livePlanId: string;
        try {
          livePlanId = await resolveCanonicalLivePlanId(planRef);
        } catch {
          opsLog({
            type: OPS_EVENT.webhook_processing_failed,
            category: "WEBHOOK",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: { provider, providerEventId: orderId, eventType, reason: "plan_not_found", planId },
          });
          return res.json({ status: "error", message: "Plan not found" });
        }
        const plan = await resolveLivePlanDisplayByPlanRef(livePlanId);

        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const activatedId = await updateSubscriptionForActivation(
          userId,
          {
            planId: livePlanId,
            status: "active",
            stripeSubscriptionId: orderId,
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            trialEndsAt: null,
          },
          { planId: livePlanId }
        );

        if (activatedId == null) {
          opsLog({
            type: OPS_EVENT.webhook_processing_failed,
            category: "WEBHOOK",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: {
              provider,
              providerEventId: orderId,
              eventType,
              reason: "no_subscription_row",
              userId,
              planId,
            },
          });
          return res.json({ status: "error", message: "No subscription row to activate" });
        }

        const legacyForBind = resolveLegacyPlanIdFromPlan(livePlanId);
        if (legacyForBind != null) {
          await ensureLivePlanBoundForSubscription({
            subscriptionId: activatedId,
            legacyPlanId: legacyForBind,
            event: "plan_selected",
            actorId: userId,
          });
        }

        opsLog({
          type: OPS_EVENT.payment_subscription_activated,
          category: "PAYMENT",
          severity: "info",
          ts: new Date().toISOString(),
          correlationId,
          route,
          method,
          metadata: {
            provider,
            providerEventId: orderId,
            eventType,
            userId,
            planId,
            captureStatus: capturedOrder.status,
          },
        });

        // Send email notification to owner about new subscription
        try {
          let userName: string | null = null;
          let userEmail: string | null = null;
          const user = await getUserById(userId);
          if (user) {
            userName = user.name;
            userEmail = user.email;
          }

          const purchaseUnit = event.resource.purchase_units?.[0];
          const amountValue = purchaseUnit?.amount?.value;
          const currencyCode = purchaseUnit?.amount?.currency_code ?? "USD";
          const amount =
            amountValue != null
              ? `${amountValue} ${currencyCode}`
              : "غير محدد";

          await notifyOwnerNewSubscription({
            userName,
            userEmail,
            planName: plan?.nameAr || plan?.nameEn || "غير محدد",
            billingCycle: "monthly",
            amount,
          });
        } catch (e) {
          opsLog({
            type: OPS_EVENT.payment_runtime_anomaly,
            category: "PAYMENT",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: {
              provider,
              providerEventId: orderId,
              anomaly: "owner_email_notification_failed",
            },
          });
        }

        // Send welcome email to user
        try {
          const restaurants = await getRestaurantsByUser(userId);
          const restaurantName = restaurants?.[0]?.nameAr || "مطعمك";

          // Note: Email sending would require fetching user email from database
          // For now, we'll just log the action
          opsLog({
            type: OPS_EVENT.payment_runtime_anomaly,
            category: "PAYMENT",
            severity: "info",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: {
              provider,
              providerEventId: orderId,
              note: "welcome_email_not_sent_missing_user_email",
              restaurantName,
            },
          });
        } catch (emailError) {
          opsLog({
            type: OPS_EVENT.payment_runtime_anomaly,
            category: "PAYMENT",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            metadata: {
              provider,
              providerEventId: orderId,
              anomaly: "welcome_email_processing_failed",
              error: emailError instanceof Error ? emailError.message : String(emailError),
            },
          });
        }

        opsLog({
          type: OPS_EVENT.webhook_processing_completed,
          category: "WEBHOOK",
          severity: "info",
          ts: new Date().toISOString(),
          correlationId,
          route,
          method,
          metadata: { provider, providerEventId: orderId, eventType, outcome: "completed" },
        });
        return res.json({ status: "success" });
      }
    }

    opsLog({
      type: OPS_EVENT.webhook_processing_completed,
      category: "WEBHOOK",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: { provider, providerEventId: orderId || undefined, eventType, outcome: "ignored" },
    });
    return res.json({ status: "received" });
  } catch (error) {
    opsLog({
      type: OPS_EVENT.webhook_processing_failed,
      category: "WEBHOOK",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: {
        provider,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return res.status(500).json({ status: "error", message: String(error) });
  }
}
