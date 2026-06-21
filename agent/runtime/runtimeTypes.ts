/**
 * THERMAL-PRINTING-6D — reference agent runtime container.
 */
import type { HeartbeatManager } from "../heartbeat/heartbeatManager";
import type { AgentLocalIdentity } from "../identity/identityStore";
import type { ReconnectEngine } from "../reconnect/reconnectEngine";
import type { AgentWebSocketClient } from "../transport/websocketClient";
import type { AgentBootConfig } from "./config";
import type { AgentLifecycle } from "./lifecycle";
import type { AgentStartupReportingState } from "./startupReporting";

export type AgentRuntime = {
  lifecycle: AgentLifecycle;
  identity: AgentLocalIdentity;
  client: AgentWebSocketClient;
  reconnect: ReconnectEngine;
  heartbeat: HeartbeatManager;
  config: AgentBootConfig;
  startupReporting: AgentStartupReportingState;
};
