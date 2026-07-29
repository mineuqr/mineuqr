/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * In-process observability store — counters, channel gauges, latency rings.
 * Visibility only; never throws into callers.
 */

import type { RealtimeChannel } from "@shared/realtime-platform";
import { REALTIME_CHANNELS } from "@shared/realtime-platform";
import { LatencyRingBuffer, type LatencyPercentiles } from "./realtimeLatency";

export type ChannelObservabilitySnapshot = {
  channel: RealtimeChannel;
  subscribers: number;
  publishes: number;
  deliveries: number;
  dropped: number;
  authFailures: number;
  reconnects: number;
  publishToDeliver: LatencyPercentiles;
};

export type DisconnectReason =
  | "client_close"
  | "error"
  | "shutdown"
  | "rejected"
  | "unknown";

type ChannelBucket = {
  subscribers: number;
  publishes: number;
  deliveries: number;
  dropped: number;
  authFailures: number;
  reconnects: number;
  publishToDeliver: LatencyRingBuffer;
};

function emptyChannel(): ChannelBucket {
  return {
    subscribers: 0,
    publishes: 0,
    deliveries: 0,
    dropped: 0,
    authFailures: 0,
    reconnects: 0,
    publishToDeliver: new LatencyRingBuffer(),
  };
}

const channels = new Map<string, ChannelBucket>();
const tenantConnections = new Map<number, number>();
const connectionOpenedAt = new Map<string, number>();
/** correlationId → publish epoch ms (short TTL map). */
const publishMarks = new Map<string, number>();

let peakConnections = 0;
let connectionsOpened = 0;
let connectionsClosed = 0;
let connectionsRejected = 0;
let connectionsFailed = 0;
let authSuccess = 0;
let authDenied = 0;
let registryCleanupCount = 0;
let registryCleanupDurationMsSum = 0;
let totalConnectionDurationMs = 0;
let connectionDurationSamples = 0;

const authLatency = new LatencyRingBuffer();
const publishToDeliverLatency = new LatencyRingBuffer();
const disconnectReasons: Record<DisconnectReason, number> = {
  client_close: 0,
  error: 0,
  shutdown: 0,
  rejected: 0,
  unknown: 0,
};

function channelBucket(channel: string): ChannelBucket {
  let b = channels.get(channel);
  if (!b) {
    b = emptyChannel();
    channels.set(channel, b);
  }
  return b;
}

export function resetRealtimeObservabilityStore(): void {
  channels.clear();
  tenantConnections.clear();
  connectionOpenedAt.clear();
  publishMarks.clear();
  peakConnections = 0;
  connectionsOpened = 0;
  connectionsClosed = 0;
  connectionsRejected = 0;
  connectionsFailed = 0;
  authSuccess = 0;
  authDenied = 0;
  registryCleanupCount = 0;
  registryCleanupDurationMsSum = 0;
  totalConnectionDurationMs = 0;
  connectionDurationSamples = 0;
  authLatency.clear();
  publishToDeliverLatency.clear();
  for (const k of Object.keys(disconnectReasons) as DisconnectReason[]) {
    disconnectReasons[k] = 0;
  }
}

export function observeConnectionOpened(input: {
  connectionId: string;
  restaurantId: number;
  channels: readonly string[];
  activeConnections: number;
}): void {
  try {
    connectionsOpened += 1;
    connectionOpenedAt.set(input.connectionId, Date.now());
    if (input.activeConnections > peakConnections) {
      peakConnections = input.activeConnections;
    }
    tenantConnections.set(
      input.restaurantId,
      (tenantConnections.get(input.restaurantId) ?? 0) + 1
    );
    for (const ch of input.channels) {
      channelBucket(ch).subscribers += 1;
    }
  } catch {
    /* never throw */
  }
}

export function observeConnectionClosed(input: {
  connectionId: string;
  restaurantId: number;
  channels: readonly string[];
  reason?: DisconnectReason;
}): void {
  try {
    connectionsClosed += 1;
    const reason = input.reason ?? "client_close";
    disconnectReasons[reason] += 1;
    const opened = connectionOpenedAt.get(input.connectionId);
    if (opened != null) {
      totalConnectionDurationMs += Date.now() - opened;
      connectionDurationSamples += 1;
      connectionOpenedAt.delete(input.connectionId);
    }
    const prev = tenantConnections.get(input.restaurantId) ?? 0;
    if (prev <= 1) tenantConnections.delete(input.restaurantId);
    else tenantConnections.set(input.restaurantId, prev - 1);
    for (const ch of input.channels) {
      const b = channelBucket(ch);
      b.subscribers = Math.max(0, b.subscribers - 1);
    }
  } catch {
    /* never throw */
  }
}

export function observeConnectionRejected(code?: string): void {
  try {
    connectionsRejected += 1;
    connectionsFailed += 1;
    disconnectReasons.rejected += 1;
    void code;
  } catch {
    /* never throw */
  }
}

export function observeAuthSuccess(durationMs?: number): void {
  try {
    authSuccess += 1;
    if (durationMs != null) authLatency.record(durationMs);
  } catch {
    /* never throw */
  }
}

export function observeAuthDenied(code?: string): void {
  try {
    authDenied += 1;
    void code;
  } catch {
    /* never throw */
  }
}

export function observeChannelAuthFailure(channel?: string): void {
  try {
    if (channel) channelBucket(channel).authFailures += 1;
  } catch {
    /* never throw */
  }
}

export function observeHintPublished(input: {
  channel: string;
  correlationId?: string;
  ts?: string;
}): void {
  try {
    channelBucket(input.channel).publishes += 1;
    if (input.correlationId) {
      const t = input.ts ? Date.parse(input.ts) : Date.now();
      if (Number.isFinite(t)) {
        publishMarks.set(input.correlationId, t);
        // Bound map size
        if (publishMarks.size > 2000) {
          const first = publishMarks.keys().next().value;
          if (first) publishMarks.delete(first);
        }
      }
    }
  } catch {
    /* never throw */
  }
}

export function observeHintDelivered(input: {
  channel: string;
  correlationId?: string;
}): void {
  try {
    channelBucket(input.channel).deliveries += 1;
    if (input.correlationId && publishMarks.has(input.correlationId)) {
      const start = publishMarks.get(input.correlationId)!;
      const ms = Math.max(0, Date.now() - start);
      publishToDeliverLatency.record(ms);
      channelBucket(input.channel).publishToDeliver.record(ms);
      publishMarks.delete(input.correlationId);
    }
  } catch {
    /* never throw */
  }
}

export function observeHintDropped(channel?: string): void {
  try {
    if (channel) channelBucket(channel).dropped += 1;
  } catch {
    /* never throw */
  }
}

export function observeReconnect(channel?: string): void {
  try {
    if (channel) channelBucket(channel).reconnects += 1;
  } catch {
    /* never throw */
  }
}

export function observeRegistryCleanup(removed: number, durationMs: number): void {
  try {
    registryCleanupCount += removed;
    registryCleanupDurationMsSum += durationMs;
  } catch {
    /* never throw */
  }
}

export function getChannelObservabilitySnapshots(): ChannelObservabilitySnapshot[] {
  return REALTIME_CHANNELS.map((channel) => {
    const b = channels.get(channel) ?? emptyChannel();
    return {
      channel,
      subscribers: b.subscribers,
      publishes: b.publishes,
      deliveries: b.deliveries,
      dropped: b.dropped,
      authFailures: b.authFailures,
      reconnects: b.reconnects,
      publishToDeliver: b.publishToDeliver.percentiles(),
    };
  });
}

export function getObservabilityConnectionStats(activeConnections: number) {
  return {
    active: activeConnections,
    peak: Math.max(peakConnections, activeConnections),
    opened: connectionsOpened,
    closed: connectionsClosed,
    rejected: connectionsRejected,
    failed: connectionsFailed,
    avgDurationMs:
      connectionDurationSamples > 0
        ? totalConnectionDurationMs / connectionDurationSamples
        : 0,
    disconnectReasons: { ...disconnectReasons },
    tenantsWithConnections: tenantConnections.size,
    connectionsPerTenant: Object.fromEntries(
      [...tenantConnections.entries()].map(([k, v]) => [String(k), v])
    ),
  };
}

export function getObservabilityAuthStats() {
  return {
    success: authSuccess,
    denied: authDenied,
    latency: authLatency.percentiles(),
  };
}

export function getObservabilityLatencyStats() {
  return {
    publishToDeliver: publishToDeliverLatency.percentiles(),
    auth: authLatency.percentiles(),
  };
}

export function getObservabilityRegistryExtras() {
  return {
    cleanupCount: registryCleanupCount,
    cleanupDurationMsSum: registryCleanupDurationMsSum,
  };
}
