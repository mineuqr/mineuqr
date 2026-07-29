/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Client realtime platform public API.
 */

export {
  RealtimePlatformClient,
  RealtimeBroadcastBridge,
  buildRealtimeSseUrl,
  getRealtimePlatform,
  __resetRealtimePlatformForTests,
  type RealtimeConnectionState,
  type RealtimeConnectOptions,
  type RealtimeHintHandler,
  type RealtimePlatformHandlers,
} from "./RealtimePlatformClient";

export {
  getRealtimeClientObservability,
  resetRealtimeClientObservability,
  type RealtimeClientObservabilitySnapshot,
} from "./realtimeClientObservability";

export {
  REALTIME_CHANNELS,
  REALTIME_PROTOCOL_VERSION,
  REALTIME_SURFACE_CAPABILITY_REGISTRY,
  DEFAULT_CLIENT_CAPABILITIES,
  type RealtimeChannel,
  type RealtimeHint,
} from "@shared/realtime-platform";
