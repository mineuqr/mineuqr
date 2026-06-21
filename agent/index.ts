/**
 * THERMAL-PRINTING-6D — MineuQR Reference Print Agent (Phase-1).
 *
 * Phase-1 scope: lifecycle, identity, registration, heartbeats, reconnect, persistence.
 * Does not create print jobs or modify MineuQR business state.
 */
export { bootAgent, createMockAgentRuntime } from "./runtime/boot";
export type { AgentBootConfig } from "./runtime/config";
export { AgentLifecycle } from "./runtime/lifecycle";
export { shutdownAgent } from "./runtime/shutdown";
export type { AgentRuntime } from "./runtime/runtimeTypes";
export {
  assertTransition,
  canTransition,
  type AgentState,
  AgentLifecycleError,
} from "./runtime/state";

export { createIdentity } from "./identity/createIdentity";
export { loadIdentity } from "./identity/loadIdentity";
export {
  FileIdentityStore,
  MemoryIdentityStore,
  type AgentLocalIdentity,
  type IdentityStore,
} from "./identity/identityStore";

export {
  buildRegistrationPayload,
  buildAgentHelloWireMessage,
  registerAgentWithServer,
  REFERENCE_AGENT_VERSION,
} from "./registration/registerAgent";
export type {
  AgentRegistrationPayload,
  AgentRegistrationResult,
} from "./registration/registrationTypes";

export {
  HeartbeatManager,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
} from "./heartbeat/heartbeatManager";

export {
  ReconnectEngine,
  DEFAULT_RECONNECT_INITIAL_DELAY_MS,
  DEFAULT_RECONNECT_MAX_DELAY_MS,
  DEFAULT_RECONNECT_MULTIPLIER,
} from "./reconnect/reconnectEngine";

export {
  WsAgentWebSocketClient,
  MockAgentWebSocketClient,
  type AgentWebSocketClient,
} from "./transport/websocketClient";

export { detectReferenceAgentPlatform } from "./platform/detectPlatform";
