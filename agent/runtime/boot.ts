/**
 * THERMAL-PRINTING-6D — reference agent boot orchestration (Phase-1).
 */
import { HeartbeatManager } from "../heartbeat/heartbeatManager";
import { loadIdentity } from "../identity/loadIdentity";
import { registerAgentWithServer } from "../registration/registerAgent";
import { ReconnectEngine } from "../reconnect/reconnectEngine";
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

  const runtime: AgentRuntime = {
    lifecycle,
    identity,
    client,
    reconnect: null as unknown as ReconnectEngine,
    heartbeat: createHeartbeatManager(config, identity.agentId, client),
    config,
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

    lifecycle.transition("ready");
    runtime.heartbeat.start();
  };

  runtime.reconnect = new ReconnectEngine({
    client,
    serverUrl: config.serverUrl,
    initialDelayMs: config.reconnectInitialDelayMs,
    maxDelayMs: config.reconnectMaxDelayMs,
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
