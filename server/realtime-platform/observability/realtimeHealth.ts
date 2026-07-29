/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Health model — operational status only (no business payloads).
 */

export type RealtimeHealthStatus =
  | "healthy"
  | "warning"
  | "degraded"
  | "unavailable";

export type RealtimeComponentHealth = {
  component: string;
  status: RealtimeHealthStatus;
  detail?: string;
};

export type RealtimePlatformHealth = {
  overall: RealtimeHealthStatus;
  components: RealtimeComponentHealth[];
  evaluatedAt: string;
};

function worse(
  a: RealtimeHealthStatus,
  b: RealtimeHealthStatus
): RealtimeHealthStatus {
  const rank: Record<RealtimeHealthStatus, number> = {
    healthy: 0,
    warning: 1,
    degraded: 2,
    unavailable: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

export type RealtimeHealthInput = {
  platformEnabled: boolean;
  gatewayShuttingDown?: boolean;
  activeConnections: number;
  authFailureRate: number;
  channelAuthFailures: number;
  publishToDeliverP95Ms: number;
  fallbackActivations: number;
  registrySize: number;
  recentAuthDenied: number;
  publisherPublishes: number;
  channelSubscriberGaps: Array<{ channel: string; subscribers: number; publishes: number }>;
};

export function evaluateRealtimeHealth(
  input: RealtimeHealthInput
): RealtimePlatformHealth {
  const components: RealtimeComponentHealth[] = [];

  if (!input.platformEnabled) {
    components.push({
      component: "realtime_platform",
      status: "unavailable",
      detail: "REALTIME_PLATFORM_ENABLED off",
    });
  } else {
    components.push({ component: "realtime_platform", status: "healthy" });
  }

  if (input.gatewayShuttingDown) {
    components.push({
      component: "gateway",
      status: "unavailable",
      detail: "shutting_down",
    });
  } else {
    components.push({
      component: "gateway",
      status: input.activeConnections >= 0 ? "healthy" : "degraded",
    });
  }

  components.push({
    component: "hint_publisher",
    status: "healthy",
    detail: `publishes=${input.publisherPublishes}`,
  });

  let registryStatus: RealtimeHealthStatus = "healthy";
  if (input.registrySize > 50_000) registryStatus = "warning";
  if (input.registrySize > 200_000) registryStatus = "degraded";
  components.push({
    component: "ticket_registry",
    status: registryStatus,
    detail: `size=${input.registrySize}`,
  });

  let authStatus: RealtimeHealthStatus = "healthy";
  if (input.authFailureRate > 0.2 || input.recentAuthDenied > 50) {
    authStatus = "warning";
  }
  if (input.authFailureRate > 0.5 || input.channelAuthFailures > 100) {
    authStatus = "degraded";
  }
  components.push({
    component: "authorization",
    status: authStatus,
  });

  for (const ch of input.channelSubscriberGaps) {
    let status: RealtimeHealthStatus = "healthy";
    // High publish with zero subscribers is informational, not an outage.
    if (ch.publishes > 100 && ch.subscribers === 0) status = "warning";
    components.push({
      component: `channel:${ch.channel}`,
      status,
      detail: `subscribers=${ch.subscribers},publishes=${ch.publishes}`,
    });
  }

  components.push({
    component: "connection_pool",
    status:
      input.activeConnections > 5_000
        ? "warning"
        : input.activeConnections > 20_000
          ? "degraded"
          : "healthy",
    detail: `active=${input.activeConnections}`,
  });

  if (input.publishToDeliverP95Ms > 1_000) {
    components.push({
      component: "latency",
      status: "warning",
      detail: `publish_to_deliver_p95=${input.publishToDeliverP95Ms}`,
    });
  } else {
    components.push({ component: "latency", status: "healthy" });
  }

  if (input.fallbackActivations > 100) {
    components.push({
      component: "fallback",
      status: "warning",
      detail: `activations=${input.fallbackActivations}`,
    });
  } else {
    components.push({ component: "fallback", status: "healthy" });
  }

  let overall: RealtimeHealthStatus = "healthy";
  for (const c of components) {
    overall = worse(overall, c.status);
  }

  return {
    overall,
    components,
    evaluatedAt: new Date().toISOString(),
  };
}
