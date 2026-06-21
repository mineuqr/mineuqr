/**
 * THERMAL-PRINTING-6D / 10A — reference agent runtime container.
 */
import type { JobConsumptionService } from "../consumption/jobConsumptionService";
import type { HeartbeatManager } from "../heartbeat/heartbeatManager";
import type { AgentLocalIdentity } from "../identity/identityStore";
import type { AgentJobClient } from "../jobs/jobClient";
import type { ReconnectEngine } from "../reconnect/reconnectEngine";
import type { AgentWebSocketClient } from "../transport/websocketClient";
import type { AgentBootConfig } from "./config";
import type { AgentLifecycle } from "./lifecycle";
import type { AgentStartupReportingState } from "./startupReporting";

export type AgentRuntime = {
  lifecycle: AgentLifecycle;
  identity: AgentLocalIdentity;
  client: AgentWebSocketClient;
  jobClient: AgentJobClient;
  jobConsumption: JobConsumptionService;
  reconnect: ReconnectEngine;
  heartbeat: HeartbeatManager;
  config: AgentBootConfig;
  startupReporting: AgentStartupReportingState;
};
