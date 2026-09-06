/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Client-side counters — visibility only; never changes transport decisions.
 */

export type RealtimeClientObservabilitySnapshot = {
  reconnectAttempts: number;
  reconnectSuccess: number;
  fallbackActivations: number;
  hintsReceived: number;
  catchUpSignals: number;
  /** KITCHEN-REALTIME-HARDENING-1 — dead/stale SSE detected via heartbeat silence. */
  heartbeatTimeouts: number;
  lastFallbackReason?: string;
};

const state: RealtimeClientObservabilitySnapshot = {
  reconnectAttempts: 0,
  reconnectSuccess: 0,
  fallbackActivations: 0,
  hintsReceived: 0,
  catchUpSignals: 0,
  heartbeatTimeouts: 0,
};

export function noteRealtimeClientReconnectAttempt(): void {
  state.reconnectAttempts += 1;
}

export function noteRealtimeClientReconnectSuccess(): void {
  state.reconnectSuccess += 1;
}

export function noteRealtimeClientFallback(reason: string): void {
  state.fallbackActivations += 1;
  state.lastFallbackReason = reason;
}

export function noteRealtimeClientHintReceived(): void {
  state.hintsReceived += 1;
}

export function noteRealtimeClientCatchUp(): void {
  state.catchUpSignals += 1;
}

export function noteRealtimeClientHeartbeatTimeout(): void {
  state.heartbeatTimeouts += 1;
}

export function getRealtimeClientObservability(): Readonly<RealtimeClientObservabilitySnapshot> {
  return { ...state };
}

export function resetRealtimeClientObservability(): void {
  state.reconnectAttempts = 0;
  state.reconnectSuccess = 0;
  state.fallbackActivations = 0;
  state.hintsReceived = 0;
  state.catchUpSignals = 0;
  state.heartbeatTimeouts = 0;
  delete state.lastFallbackReason;
}
