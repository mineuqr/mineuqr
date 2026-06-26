/**
 * THERMAL-PRINTING-13H.5 / 13I.3C.2 — dispatch notification idempotency (DB-backed).
 */
export {
  hasPersistedDispatchNotification as hasDispatchNotificationBeenSent,
  recordPersistedDispatchNotification as recordDispatchNotificationSent,
  clearPersistedDispatchNotificationsForTests as clearDispatchBridgeState,
} from "./dispatchNotificationRepository";
