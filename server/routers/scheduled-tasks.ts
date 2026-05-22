import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getAllSubscriptions, createNotification, markNotificationAsSent, getUnsentNotifications } from "../db";
import { notifyOwner } from "../_core/notification";

export const scheduledTasksRouter = router({
  sendRenewalNotifications: publicProcedure
    .input(
      z.object({
        daysBeforeExpiry: z.number().int().positive().default(7),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + input.daysBeforeExpiry * 24 * 60 * 60 * 1000);

        // Get all subscriptions and filter active ones expiring soon
        const allSubscriptions = await getAllSubscriptions();
        const expiringSubscriptions = allSubscriptions.filter(sub => {
          if (sub.status !== "active") return false;
          const periodEnd = new Date(sub.currentPeriodEnd);
          return periodEnd < expiryDate;
        });

        console.log(`[Scheduled Task] Found ${expiringSubscriptions.length} expiring subscriptions`);

        let notificationsCreated = 0;
        let notificationsSent = 0;

        for (const subscription of expiringSubscriptions) {
          // Check for existing unsent notifications
          const unsentNotifications = await getUnsentNotifications();
          const existingForSub = unsentNotifications.find(n => n.subscriptionId === subscription.id);
          
          if (existingForSub) {
            console.log(`[Scheduled Task] Notification already exists for subscription ${subscription.id}`);
            continue;
          }

          const periodEnd = new Date(subscription.currentPeriodEnd);
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
          expiringSubscriptionsFound: expiringSubscriptions.length,
          notificationsCreated,
          notificationsSent,
          timestamp: now.toISOString(),
        };
      } catch (error) {
        console.error("[Scheduled Task] Error sending renewal notifications:", error);
        throw new Error("Failed to send renewal notifications");
      }
    }),
});
