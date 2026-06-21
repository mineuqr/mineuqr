/**
 * THERMAL-PRINTING-6D — reference agent boot orchestration (Phase-1 / 10A / 10C consumption wiring).
 */
import {
  createProductionTransportClients,
  JobConsumptionService,
} from "../consumption/jobConsumptionService";
import { HeartbeatManager } from "../heartbeat/heartbeatManager";
import { loadIdentity } from "../identity/loadIdentity";
import { WebSocketAgentJobClient, type AgentJobClient } from "../jobs/jobClient";
import { registerAgentWithServer } from "../registration/registerAgent";
import { ReconnectEngine } from "../reconnect/reconnectEngine";
import {
  createAgentStartupReportingState,
  performAgentStartupReporting,
} from "./startupReporting";
import { MockAgentWebSocketClient, WsAgentWebSocketClient, type AgentWebSocketClient } from "../transport/websocketClient";
import type { AgentBootConfig } from "./config";
import { AgentLifecycle } from "./lifecycle";
import type { AgentRuntime } from "./runtimeTypes";
import { canTransition } from "./state";

function createHeartbeatManager(
  config: AgentBootConfig,
  identityAgentId: string,
  client: AgentWebSocketClient
): HeartbeatManager {
  return new HeartbeatManager({
    agentId: identityAgentId,
    sender: client,
    intervalMs: config.heartbeatIntervalMs,
  });
}

export async function bootAgent(config: AgentBootConfig): Promise<AgentRuntime> {
  const lifecycle = new AgentLifecycle();
  const identity = await loadIdentity({
    store: config.identityStore,
    agentName: config.agentName,
  });

  const client = config.client ?? new WsAgentWebSocketClient();
  const jobClient =
    config.jobClient ??
    new WebSocketAgentJobClient({
      agentId: identity.agentId,
      sender: client,
    });

  const transportClients =
    config.transportClients ??
    createProductionTransportClients(config.transportRetryPolicy);

  const jobConsumption = new JobConsumptionService({
    agentId: identity.agentId,
    jobClient,
    ackSender: client,
    outcomeReportSender: client,
    transportClients,
    networkTransportEndpoints: config.networkTransportEndpoints,
    usbTransportEndpoints: config.usbTransportEndpoints,
    bluetoothTransportEndpoints: config.bluetoothTransportEndpoints,
    transportRetryPolicy: config.transportRetryPolicy,
  });

  const startupReporting = createAgentStartupReportingState();

  const runtime: AgentRuntime = {
    lifecycle,
    identity,
    client,
    jobClient,
    jobConsumption,
    reconnect: null as unknown as ReconnectEngine,
    heartbeat: createHeartbeatManager(config, identity.agentId, client),
    config,
    startupReporting,
  };

  const routeTransportMessage = (data: string) => {
    if ("handleTransportMessage" in jobClient) {
      (jobClient as WebSocketAgentJobClient).handleTransportMessage(data);
    }
    jobConsumption.handleTransportMessage(data);
  };

  const performRegistration = async () => {
    if (lifecycle.getState() !== "registering") {
      lifecycle.transition("registering");
    }

    registerAgentWithServer({
      sender: client,
      identity,
      platform: config.platform,
      version: config.version,
    });

    performAgentStartupReporting({
      agentId: identity.agentId,
      platform: config.platform,
      sender: client,
      reporting: startupReporting,
      printers: config.startupPrinters,
    });

    lifecycle.transition("ready");
    runtime.heartbeat.start();
  };

  runtime.reconnect = new ReconnectEngine({
    client,
    serverUrl: config.serverUrl,
    initialDelayMs: config.reconnectInitialDelayMs,
    maxDelayMs: config.reconnectMaxDelayMs,
    onMessage: routeTransportMessage,
    onConnecting: () => {
      const state = lifecycle.getState();
      if (state === "reconnecting" && canTransition(state, "connecting")) {
        lifecycle.transition("connecting");
      }
    },
    onConnected: async () => {
      runtime.heartbeat.stop();
      runtime.heartbeat = createHeartbeatManager(config, identity.agentId, client);
      await performRegistration();
    },
    onDisconnected: () => {
      runtime.heartbeat.stop();
      if ("clearPendingRequests" in jobClient) {
        (jobClient as WebSocketAgentJobClient).clearPendingRequests();
      }
      const state = lifecycle.getState();
      if (state === "ready" || state === "registering") {
        lifecycle.transition("reconnecting");
      }
    },
    onReconnectScheduled: () => {
      const state = lifecycle.getState();
      if (state === "connecting" && canTransition(state, "reconnecting")) {
        lifecycle.transition("reconnecting");
      }
    },
  });

  lifecycle.transition("connecting");
  await runtime.reconnect.connect();

  return runtime;
}

export function createMockAgentRuntime(config: AgentBootConfig): {
  client: MockAgentWebSocketClient;
  boot: () => Promise<AgentRuntime>;
} {
  const client = new MockAgentWebSocketClient();
  return {
    client,
    boot: () => bootAgent({ ...config, client }),
  };
}
