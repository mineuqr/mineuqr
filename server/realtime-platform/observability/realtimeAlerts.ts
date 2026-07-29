/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Alert evaluation — operational thresholds only.
 */

export type RealtimeAlertSeverity = "info" | "warning" | "critical";

export type RealtimeAlert = {
  id: string;
  severity: RealtimeAlertSeverity;
  title: string;
  detail: string;
  firedAt: string;
};

export type RealtimeAlertInput = {
  activeConnections: number;
  reconnects: number;
  publishToDeliverP95Ms: number;
  authFailures: number;
  authDenied: number;
  channelAuthFailures: number;
  registryLookups: number;
  registryLookupFailuresApprox: number;
  deliveries: number;
  dropped: number;
  fallbackActivations: number;
  platformEnabled: boolean;
  gatewayUnavailable: boolean;
};

export function evaluateRealtimeAlerts(input: RealtimeAlertInput): RealtimeAlert[] {
  const firedAt = new Date().toISOString();
  const alerts: RealtimeAlert[] = [];

  if (input.gatewayUnavailable || !input.platformEnabled) {
    alerts.push({
      id: "gateway_unavailable",
      severity: "critical",
      title: "Realtime gateway unavailable",
      detail: input.platformEnabled ? "gateway_shutdown" : "platform_disabled",
      firedAt,
    });
  }

  if (input.activeConnections > 5_000) {
    alerts.push({
      id: "connection_surge",
      severity: input.activeConnections > 15_000 ? "critical" : "warning",
      title: "Connection surge",
      detail: `active=${input.activeConnections}`,
      firedAt,
    });
  }

  if (input.reconnects > 200) {
    alerts.push({
      id: "reconnect_storm",
      severity: "warning",
      title: "Reconnect storm",
      detail: `reconnects=${input.reconnects}`,
      firedAt,
    });
  }

  if (input.publishToDeliverP95Ms > 1_000) {
    alerts.push({
      id: "high_latency",
      severity: input.publishToDeliverP95Ms > 3_000 ? "critical" : "warning",
      title: "High publish→deliver latency",
      detail: `p95_ms=${input.publishToDeliverP95Ms}`,
      firedAt,
    });
  }

  if (input.authFailures > 50 || input.authDenied > 50) {
    alerts.push({
      id: "authorization_failures",
      severity: "warning",
      title: "Authorization failures elevated",
      detail: `authFailures=${input.authFailures},denied=${input.authDenied}`,
      firedAt,
    });
  }

  if (input.channelAuthFailures > 25) {
    alerts.push({
      id: "unauthorized_channel",
      severity: "warning",
      title: "Unauthorized channel attempts",
      detail: `count=${input.channelAuthFailures}`,
      firedAt,
    });
  }

  if (
    input.registryLookups > 0 &&
    input.registryLookupFailuresApprox / Math.max(1, input.registryLookups) > 0.3
  ) {
    alerts.push({
      id: "registry_lookup_failures",
      severity: "warning",
      title: "Registry lookup failures elevated",
      detail: `approx_failures=${input.registryLookupFailuresApprox}`,
      firedAt,
    });
  }

  if (input.dropped > 100 && input.dropped > input.deliveries) {
    alerts.push({
      id: "hint_delivery_failures",
      severity: "warning",
      title: "Hint drops exceed deliveries",
      detail: `dropped=${input.dropped},deliveries=${input.deliveries}`,
      firedAt,
    });
  }

  if (input.fallbackActivations > 50) {
    alerts.push({
      id: "fallback_spike",
      severity: "warning",
      title: "Polling fallback spike",
      detail: `activations=${input.fallbackActivations}`,
      firedAt,
    });
  }

  return alerts;
}
