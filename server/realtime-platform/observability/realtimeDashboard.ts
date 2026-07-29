/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Dashboard aggregation — operational metrics only.
 */

import {
  listMigratedRealtimeSurfaces,
  REALTIME_PROTOCOL_VERSION,
} from "@shared/realtime-platform";
import { getRealtimeMetrics } from "./realtimeMetrics";
import {
  getChannelObservabilitySnapshots,
  getObservabilityAuthStats,
  getObservabilityConnectionStats,
  getObservabilityLatencyStats,
  getObservabilityRegistryExtras,
} from "./realtimeObservabilityStore";
import { evaluateRealtimeHealth } from "./realtimeHealth";
import { evaluateRealtimeAlerts } from "./realtimeAlerts";
import { REALTIME_METRICS_CATALOG } from "./realtimeMetricsCatalog";
import { getOpaqueTicketRegistrySize, getOpaqueTicketRegistryStats } from "../tickets/RealtimeOpaqueTicketRegistry";
import {
  getRealtimeSseGateway,
  isRealtimePlatformEnabled,
} from "../composition";

export type RealtimeAdoptionRow = {
  surfaceId: string;
  adopted: boolean;
  channels: readonly string[];
  authMode: string;
  migrationState: "migrated" | "pending";
  activeSubscribers: number;
  health: string;
  latencyP95Ms: number;
  protocolVersion: number;
};

export function buildRealtimeObservabilityDashboard() {
  const metrics = getRealtimeMetrics();
  const gateway = getRealtimeSseGateway();
  const activeConnections = gateway.connectionCount;
  const channels = getChannelObservabilitySnapshots();
  const connections = getObservabilityConnectionStats(activeConnections);
  const auth = getObservabilityAuthStats();
  const latency = getObservabilityLatencyStats();
  const registryExtras = getObservabilityRegistryExtras();
  const registrySize = getOpaqueTicketRegistrySize();
  const registryStats = getOpaqueTicketRegistryStats();
  const enabled = isRealtimePlatformEnabled();

  const authTotal = auth.success + auth.denied;
  const authFailureRate = authTotal > 0 ? auth.denied / authTotal : 0;

  const health = evaluateRealtimeHealth({
    platformEnabled: enabled,
    activeConnections,
    authFailureRate,
    channelAuthFailures: metrics.channelAuthFailures,
    publishToDeliverP95Ms: latency.publishToDeliver.p95,
    fallbackActivations: metrics.fallbackActivations,
    registrySize,
    recentAuthDenied: auth.denied,
    publisherPublishes: metrics.publishes,
    channelSubscriberGaps: channels.map((c) => ({
      channel: c.channel,
      subscribers: c.subscribers,
      publishes: c.publishes,
    })),
  });

  const alerts = evaluateRealtimeAlerts({
    activeConnections,
    reconnects: metrics.reconnects,
    publishToDeliverP95Ms: latency.publishToDeliver.p95,
    authFailures: metrics.authFailures,
    authDenied: auth.denied,
    channelAuthFailures: metrics.channelAuthFailures,
    registryLookups: metrics.registryLookups,
    registryLookupFailuresApprox: auth.denied,
    deliveries: metrics.deliveries,
    dropped: metrics.dropped,
    fallbackActivations: metrics.fallbackActivations,
    platformEnabled: enabled,
    // Runtime failure only when platform is expected to run.
    gatewayUnavailable: false,
  });

  const adoption: RealtimeAdoptionRow[] = listMigratedRealtimeSurfaces().map(
    (surface) => {
      const chStats = surface.channels.map(
        (ch) => channels.find((c) => c.channel === ch) ?? null
      );
      const activeSubscribers = chStats.reduce(
        (n, c) => n + (c?.subscribers ?? 0),
        0
      );
      const latencyP95Ms = Math.max(
        0,
        ...chStats.map((c) => c?.publishToDeliver.p95 ?? 0)
      );
      const channelHealth =
        health.components.find((c) =>
          surface.channels.some((ch) => c.component === `channel:${ch}`)
        )?.status ?? health.overall;

      return {
        surfaceId: surface.surfaceId,
        adopted: surface.migrated,
        channels: surface.channels,
        authMode: surface.authMode,
        migrationState: surface.migrated ? "migrated" : "pending",
        activeSubscribers,
        health: channelHealth,
        latencyP95Ms,
        protocolVersion: REALTIME_PROTOCOL_VERSION,
      };
    }
  );

  return {
    program: "REALTIME-PLATFORM-OBSERVABILITY-1" as const,
    generatedAt: new Date().toISOString(),
    platform: {
      enabled,
      protocolVersion: REALTIME_PROTOCOL_VERSION,
      overallHealth: health.overall,
    },
    health,
    alerts,
    connections,
    channels: channels.filter((c) =>
      ["orders", "kitchen", "expo", "customer"].includes(c.channel)
    ),
    channelsAll: channels,
    hints: {
      published: metrics.publishes,
      delivered: metrics.deliveries,
      dropped: metrics.dropped,
      gaps: metrics.gaps,
      heartbeats: metrics.heartbeats,
    },
    latency,
    authorization: {
      ...auth,
      ticketsIssued: metrics.ticketsIssued,
      ticketsRenewed: metrics.ticketsRenewed,
      ticketsExpired: metrics.ticketsExpired,
      ticketsRevoked: metrics.ticketsRevoked,
      channelAuthFailures: metrics.channelAuthFailures,
      authFailures: metrics.authFailures,
    },
    registry: {
      size: registrySize,
      active: registryStats.active,
      expired: registryStats.expired,
      revoked: registryStats.revoked,
      lookups: metrics.registryLookups,
      lookupLatencyMicrosSum: metrics.registryLookupLatencyMicros,
      avgLookupMicros:
        metrics.registryLookups > 0
          ? metrics.registryLookupLatencyMicros / metrics.registryLookups
          : 0,
      ...registryExtras,
    },
    fallback: {
      activations: metrics.fallbackActivations,
      reconnects: metrics.reconnects,
    },
    errors: {
      authFailures: metrics.authFailures,
      channelAuthFailures: metrics.channelAuthFailures,
      dropped: metrics.dropped,
      rejectedConnections: connections.rejected,
    },
    adoption,
    catalogSize: REALTIME_METRICS_CATALOG.length,
    counters: metrics,
  };
}
