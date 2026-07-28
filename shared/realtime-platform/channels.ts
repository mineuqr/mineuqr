/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Canonical channel registry — declarative ACL & delivery metadata.
 */

export const REALTIME_CHANNELS = [
  "orders",
  "kitchen",
  "expo",
  "waiter",
  "sessions",
  "checks",
  "devices",
  "notifications",
  "dashboard",
  "customer",
  "reporting",
  "print",
] as const;

export type RealtimeChannel = (typeof REALTIME_CHANNELS)[number];

export type RealtimeAuthMode =
  | "staff_session"
  | "device_session"
  | "customer_tracking"
  | "platform_internal";

export type RealtimeDeliveryClass =
  | "critical"
  | "high"
  | "normal"
  | "best_effort";

export type RealtimeChannelDefinition = {
  channel: RealtimeChannel;
  owner: string;
  authModes: readonly RealtimeAuthMode[];
  tenantScoped: true;
  delivery: RealtimeDeliveryClass;
  /** Per-aggregate ordering required when hints carry aggregateId. */
  perAggregateOrdering: boolean;
  /** Short reconnect buffer retention hint (seconds). */
  retentionSeconds: number;
  description: string;
};

export const REALTIME_CHANNEL_REGISTRY: Record<
  RealtimeChannel,
  RealtimeChannelDefinition
> = {
  orders: {
    channel: "orders",
    owner: "order-read",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "critical",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Operational active orders invalidation",
  },
  kitchen: {
    channel: "kitchen",
    owner: "kitchen-read",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "critical",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Kitchen queue invalidation",
  },
  expo: {
    channel: "expo",
    owner: "kitchen-read",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "critical",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Expo queue invalidation",
  },
  waiter: {
    channel: "waiter",
    owner: "waiter-runtime",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Waiter workspace invalidation",
  },
  sessions: {
    channel: "sessions",
    owner: "dining-session",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Session lifecycle invalidation",
  },
  checks: {
    channel: "checks",
    owner: "settlement",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Check / settlement invalidation",
  },
  devices: {
    channel: "devices",
    owner: "device-management",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "normal",
    perAggregateOrdering: false,
    retentionSeconds: 60,
    description: "Device presence / configVersion hints",
  },
  notifications: {
    channel: "notifications",
    owner: "notifications",
    authModes: ["staff_session"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: false,
    retentionSeconds: 120,
    description: "Owner notification invalidation",
  },
  dashboard: {
    channel: "dashboard",
    owner: "ops-dashboard",
    authModes: ["staff_session"],
    tenantScoped: true,
    delivery: "normal",
    perAggregateOrdering: false,
    retentionSeconds: 60,
    description: "Dashboard board invalidation",
  },
  customer: {
    channel: "customer",
    owner: "customer-tracking",
    authModes: ["customer_tracking"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Guest tracking invalidation (token-scoped)",
  },
  reporting: {
    channel: "reporting",
    owner: "reporting",
    authModes: ["staff_session"],
    tenantScoped: true,
    delivery: "best_effort",
    perAggregateOrdering: false,
    retentionSeconds: 30,
    description: "Reporting live-view invalidation",
  },
  print: {
    channel: "print",
    owner: "print-workspace",
    authModes: ["staff_session", "device_session"],
    tenantScoped: true,
    delivery: "high",
    perAggregateOrdering: true,
    retentionSeconds: 120,
    description: "Print job UI invalidation (not connector WS)",
  },
};

export function isRealtimeChannel(value: string): value is RealtimeChannel {
  return (REALTIME_CHANNELS as readonly string[]).includes(value);
}

export function getRealtimeChannelDefinition(
  channel: RealtimeChannel
): RealtimeChannelDefinition {
  return REALTIME_CHANNEL_REGISTRY[channel];
}
