/**
 * THERMAL-PRINTING-12E.2A — endpoint connectivity model (platform-neutral).
 *
 * Distinct from legacy agent connectivity (`agentTypes.AgentStatus` lowercase).
 * Endpoints use uppercase literals for registry persistence and cross-surface APIs.
 */

export const ENDPOINT_CONNECTIVITY_STATES = [
  "ONLINE",
  "OFFLINE",
  "STALE",
  "UNKNOWN",
] as const;

export type EndpointConnectivityState =
  (typeof ENDPOINT_CONNECTIVITY_STATES)[number];

export const DEFAULT_ENDPOINT_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export class EndpointConnectivityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointConnectivityValidationError";
  }
}

export function isEndpointConnectivityState(
  value: string
): value is EndpointConnectivityState {
  return (ENDPOINT_CONNECTIVITY_STATES as readonly string[]).includes(value);
}

export function assertEndpointConnectivityState(
  value: string
): EndpointConnectivityState {
  if (!isEndpointConnectivityState(value)) {
    throw new EndpointConnectivityValidationError(
      `Invalid endpoint connectivity state: ${value}`
    );
  }
  return value;
}

export type EvaluateEndpointConnectivityInput = {
  isRegistered: boolean;
  lastSeenAt: Date | null;
  now?: Date;
  staleThresholdMs?: number;
};

export function evaluateEndpointConnectivityState(
  input: EvaluateEndpointConnectivityInput
): EndpointConnectivityState {
  if (!input.isRegistered) {
    return "OFFLINE";
  }

  if (!input.lastSeenAt) {
    return "UNKNOWN";
  }

  const now = input.now ?? new Date();
  const staleThresholdMs =
    input.staleThresholdMs ?? DEFAULT_ENDPOINT_STALE_THRESHOLD_MS;
  const elapsedMs = now.getTime() - input.lastSeenAt.getTime();

  if (elapsedMs > staleThresholdMs) {
    return "STALE";
  }

  return "ONLINE";
}
