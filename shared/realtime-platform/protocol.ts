/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Protocol versioning & negotiation — transport only.
 */

export const REALTIME_PLATFORM_PROGRAM =
  "REALTIME-PLATFORM-FOUNDATION-1" as const;

/** Current wire protocol. */
export const REALTIME_PROTOCOL_VERSION = 1 as const;

/** Oldest protocol the server still accepts. */
export const REALTIME_PROTOCOL_MIN_VERSION = 1 as const;

export type RealtimeProtocolVersion = typeof REALTIME_PROTOCOL_VERSION;

export type RealtimeClientCapabilities = {
  protocolVersion: number;
  heartbeat: boolean;
  broadcastBridge: boolean;
  reconnect: boolean;
  pollFallback: boolean;
  compression: boolean;
  lastEventIdResume: boolean;
};

export type RealtimeServerCapabilities = {
  protocolVersion: RealtimeProtocolVersion;
  heartbeat: boolean;
  broadcastBridge: boolean;
  reconnect: boolean;
  pollFallback: boolean;
  compression: boolean;
  lastEventIdResume: boolean;
  maxChannelsPerConnection: number;
  ticketTtlSeconds: number;
  heartbeatIntervalMs: number;
};

export const DEFAULT_CLIENT_CAPABILITIES: RealtimeClientCapabilities = {
  protocolVersion: REALTIME_PROTOCOL_VERSION,
  heartbeat: true,
  broadcastBridge: true,
  reconnect: true,
  pollFallback: true,
  compression: false,
  lastEventIdResume: true,
};

export const DEFAULT_SERVER_CAPABILITIES: RealtimeServerCapabilities = {
  protocolVersion: REALTIME_PROTOCOL_VERSION,
  heartbeat: true,
  broadcastBridge: true,
  reconnect: true,
  pollFallback: true,
  compression: false,
  lastEventIdResume: true,
  maxChannelsPerConnection: 16,
  ticketTtlSeconds: 600,
  heartbeatIntervalMs: 15_000,
};

export type RealtimeNegotiationResult = {
  ok: true;
  negotiated: RealtimeServerCapabilities;
  client: RealtimeClientCapabilities;
} | {
  ok: false;
  code: "protocol_unsupported" | "capability_rejected";
  message: string;
};

export function negotiateRealtimeCapabilities(
  client: Partial<RealtimeClientCapabilities> | undefined
): RealtimeNegotiationResult {
  const requestedVersion =
    client?.protocolVersion ?? REALTIME_PROTOCOL_VERSION;

  if (
    requestedVersion < REALTIME_PROTOCOL_MIN_VERSION ||
    requestedVersion > REALTIME_PROTOCOL_VERSION
  ) {
    return {
      ok: false,
      code: "protocol_unsupported",
      message: `Unsupported realtime protocol version ${requestedVersion}`,
    };
  }

  const normalized: RealtimeClientCapabilities = {
    ...DEFAULT_CLIENT_CAPABILITIES,
    ...client,
    protocolVersion: requestedVersion,
  };

  // Server never enables a capability the client did not offer.
  const negotiated: RealtimeServerCapabilities = {
    ...DEFAULT_SERVER_CAPABILITIES,
    protocolVersion: REALTIME_PROTOCOL_VERSION,
    heartbeat: DEFAULT_SERVER_CAPABILITIES.heartbeat && normalized.heartbeat,
    broadcastBridge:
      DEFAULT_SERVER_CAPABILITIES.broadcastBridge &&
      normalized.broadcastBridge,
    reconnect: DEFAULT_SERVER_CAPABILITIES.reconnect && normalized.reconnect,
    pollFallback:
      DEFAULT_SERVER_CAPABILITIES.pollFallback && normalized.pollFallback,
    compression:
      DEFAULT_SERVER_CAPABILITIES.compression && normalized.compression,
    lastEventIdResume:
      DEFAULT_SERVER_CAPABILITIES.lastEventIdResume &&
      normalized.lastEventIdResume,
  };

  return { ok: true, negotiated, client: normalized };
}
