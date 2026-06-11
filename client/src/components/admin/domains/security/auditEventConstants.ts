/** ADMIN-SECURITY-CENTER PR-8 — audit list client constants (within PR-6 API limits). */

export const AUDIT_LIST_PAGE_SIZE = 25;

export const ROLE_CHANGE_EVENT_TYPE = "user_role_changed" as const;

export const SUBSCRIPTION_CHANGE_EVENT_TYPES = [
  "subscription_created_by_admin",
  "subscription_updated_by_admin",
  "cascade_subscription_deleted",
] as const;

export type SubscriptionChangeEventType =
  (typeof SUBSCRIPTION_CHANGE_EVENT_TYPES)[number];
