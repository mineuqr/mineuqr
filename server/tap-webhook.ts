import type { Request, Response } from "express";
import { retrieveTapCharge } from "./tap-payments";
import { getCorrelationId } from "./_core/requestContext";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { noteWebhookEvent } from "./_core/webhookDedup";
import {
  updateSubscriptionById,
  getSubscriptionById,
  getUserById,
} from "./db";
import { updateSubscriptionForActivation } from "./db";
import { notifyOwnerNewSubscription } from "./owner-email-notifications";
import { ensureLivePlanBoundForSubscription } from "./services/commercial-catalog";

export async function handleTapWebhook(req: Request, res: Response) {
  const correlationId = getCorrelationId(req);
  const provider = "tap" as const;
  const method = req.method;
  const route = req.path;

  try {
    const body = req.body;
    const chargeId = body?.id ? String(body.id) : "";

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
        providerEventId: chargeId || undefined,
      },
    });

    // Tap sends the charge ID in the webhook payload
    if (!chargeId) {
      opsLog({
        type: OPS_EVENT.webhook_processing_failed,
        category: "WEBHOOK",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        metadata: { provider, reason: "missing_charge_id" },
      });
      return res.status(400).json({ error: "Missing charge ID" });
    }

    noteWebhookEvent({
      provider,
      providerEventId: chargeId,
      correlationId,
      route,
      method,
      eventType: "tap.charge",
    });

    opsLog({
      type: OPS_EVENT.webhook_processing_started,
      category: "WEBHOOK",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: {
        provider,
        providerEventId: chargeId,
      },
    });

    // Retrieve the full charge details from Tap API
    const charge = await retrieveTapCharge(chargeId);
    const chargeStatus = charge?.status ? String(charge.status) : "unknown";

    if (charge.status === "CAPTURED") {
      // Payment successful
      const metadata = charge.metadata || {};
      const userId = metadata.user_id;
      const subscriptionId = metadata.subscription_id;
      const billingCycle = metadata.billing_cycle;

      const now = new Date();
      const endDate = new Date(now);
      if (billingCycle === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      const activationPayload = {
        status: "active" as const,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
      };
      const planId = metadata.plan_id ? parseInt(String(metadata.plan_id), 10) : undefined;
      const planIdOpt = planId != null && !isNaN(planId) ? planId : undefined;

      const subIdRaw = subscriptionId ? parseInt(String(subscriptionId), 10) : NaN;
      const subId = !isNaN(subIdRaw) && subIdRaw > 0 ? subIdRaw : undefined;
      const uidRaw = userId ? parseInt(String(userId), 10) : NaN;
      const uid = !isNaN(uidRaw) ? uidRaw : undefined;

      let activatedId: number | null = null;

      if (subId != null) {
        const row = await getSubscriptionById(subId);
        if (row && (uid == null || row.userId === uid)) {
          await updateSubscriptionById(subId, activationPayload);
          activatedId = subId;
        }
      } else if (uid != null) {
        activatedId = await updateSubscriptionForActivation(uid, activationPayload, {
          planId: planIdOpt,
        });
      }

      if (activatedId != null) {
        const boundPlanId =
          planIdOpt ??
          (await getSubscriptionById(activatedId))?.planId ??
          null;
        if (boundPlanId != null) {
          await ensureLivePlanBoundForSubscription({
            subscriptionId: activatedId,
            legacyPlanId: boundPlanId,
            event: "plan_selected",
            actorId: uid ?? null,
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
            providerEventId: chargeId,
            chargeStatus,
            subscriptionId: activatedId,
            userId: uid,
            billingCycle: billingCycle || "monthly",
            planId: planIdOpt,
          },
        });
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
          const { resolveLivePlanDisplayByLegacyId } = await import(
            "./services/commercial-catalog"
          );
          const plan = await resolveLivePlanDisplayByLegacyId(parseInt(planId, 10));
          if (plan) planName = plan.nameAr || plan.nameEn;
        }
        await notifyOwnerNewSubscription({
          userName,
          userEmail,
          planName,
          billingCycle: billingCycle || "monthly",
          amount: charge.amount ? `${charge.amount} ${charge.currency || 'USD'}` : "غير محدد",
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
            providerEventId: chargeId,
            anomaly: "owner_email_notification_failed",
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
        metadata: {
          provider,
          providerEventId: chargeId,
          outcome: "captured",
          chargeStatus,
        },
      });

      return res.json({ received: true, status: "captured" });
    } else if (charge.status === "FAILED" || charge.status === "DECLINED") {
      opsLog({
        type: OPS_EVENT.webhook_processing_completed,
        category: "WEBHOOK",
        severity: "info",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        metadata: {
          provider,
          providerEventId: chargeId,
          outcome: "payment_failed",
          chargeStatus,
        },
      });
      return res.json({ received: true, status: charge.status.toLowerCase() });
    }

    // For other statuses (INITIATED, etc.)
    opsLog({
      type: OPS_EVENT.webhook_processing_completed,
      category: "WEBHOOK",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: {
        provider,
        providerEventId: chargeId,
        outcome: "other_status",
        chargeStatus,
      },
    });
    return res.json({ received: true, status: charge.status?.toLowerCase() });
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
        providerEventId: undefined,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
