import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { parseStoredUtcInstant } from "@shared/utils/timezone";
import { getAllSubscriptions, createNotification, markNotificationAsSent, getUnsentNotifications } from "../db";
import { notifyOwner } from "../_core/notification";
import { trackScheduledTaskRun } from "../_core/healthSignals";

export const scheduledTasksRouter = router({
  sendRenewalNotifications: publicProcedure
    .input(
      z.object({
        daysBeforeExpiry: z.number().int().positive().default(7),
      })
    )
    .mutation(async ({ input }) => {
      const taskName = "scheduledTasks.sendRenewalNotifications";
      const startedAt = Date.now();
      trackScheduledTaskRun({
        taskName,
        phase: "started",
      });

      // Best-effort health counters (visibility-only).
      let expiringSubscriptionsFound = 0;
      let unsentNotificationScans = 0;
      let notificationsCreated = 0;
      let notificationsSent = 0;

      try {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + input.daysBeforeExpiry * 24 * 60 * 60 * 1000);

        const allSubscriptions = await getAllSubscriptions();
        const expiringSubscriptions = allSubscriptions.filter(sub => {
          if (sub.status !== "active") return false;
          const periodEnd = parseStoredUtcInstant(sub.currentPeriodEnd);
          if (!periodEnd) return false;
          return periodEnd < expiryDate;
        });

        expiringSubscriptionsFound = expiringSubscriptions.length;
        console.log(`[Scheduled Task] Found ${expiringSubscriptionsFound} expiring subscriptions`);

        for (const subscription of expiringSubscriptions) {
          // Check for existing unsent notifications
          unsentNotificationScans += 1;
          const unsentNotifications = await getUnsentNotifications();
          const existingForSub = unsentNotifications.find(n => n.subscriptionId === subscription.id);
          
          if (existingForSub) {
            console.log(`[Scheduled Task] Notification already exists for subscription ${subscription.id}`);
            continue;
          }

          const periodEnd = parseStoredUtcInstant(subscription.currentPeriodEnd);
          if (!periodEnd) continue;

          const daysUntilExpiry = Math.ceil(
            (periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          try {
            const result = await createNotification({
              userId: subscription.userId,
              subscriptionId: subscription.id,
              notificationType: daysUntilExpiry <= 1 ? '1_day_before' : '7_days_before',
              isRead: false,
              isSent: false,
            });

            notificationsCreated++;

            try {
              // Send in-app notification to owner
              const notifyResult = await notifyOwner({
                title: `Subscription Renewal Reminder - ${daysUntilExpiry} Days Left`,
                content: `Subscription will expire in ${daysUntilExpiry} days. Please renew to maintain service continuity.`,
              });

              if (notifyResult && result?.id) {
                await markNotificationAsSent(result.id);
                notificationsSent++;
                console.log(`[Scheduled Task] Notification sent for subscription ${subscription.id}`);
              }
            } catch (error) {
              console.error(`[Scheduled Task] Failed to send notification for subscription ${subscription.id}:`, error);
            }
          } catch (error) {
            console.error(`[Scheduled Task] Failed to create notification for subscription ${subscription.id}:`, error);
          }
        }

        return {
          success: true,
          expiringSubscriptionsFound,
          notificationsCreated,
          notificationsSent,
          timestamp: now.toISOString(),
        };
      } catch (error) {
        console.error("[Scheduled Task] Error sending renewal notifications:", error);
        trackScheduledTaskRun({
          taskName,
          phase: "warning",
          durationMs: Date.now() - startedAt,
          metadata: {
            degradedReason: "scheduled_task_exception",
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw new Error("Failed to send renewal notifications");
      } finally {
        const durationMs = Date.now() - startedAt;

        // Degraded runtime visibility (threshold-only).
        const EXPIRING_SUBS_WARN = 200;
        const UNSENT_SCAN_WARN = 200;
        const DURATION_WARN_MS = 10_000;

        // Emit a coarse warning when runtime pressure is likely.
        // (Uses existing counters computed during successful runs.)
        if (
          durationMs >= DURATION_WARN_MS ||
          expiringSubscriptionsFound >= EXPIRING_SUBS_WARN ||
          unsentNotificationScans >= UNSENT_SCAN_WARN
        ) {
          trackScheduledTaskRun({
            taskName,
            phase: "warning",
            durationMs,
            metadata: {
              degradedReason: "scheduled_task_pressure",
              expiringSubscriptionsFound,
              unsentNotificationScans,
              notificationsCreated,
              notificationsSent,
            },
          });
        }

        trackScheduledTaskRun({
          taskName,
          phase: "completed",
          durationMs,
        });
      }
    }),
});
