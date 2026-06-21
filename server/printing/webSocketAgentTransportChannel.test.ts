import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  clearAgentConnections,
  getConnection,
  listConnections,
  registerConnection,
  unregisterConnection,
  AgentWebSocketReadyState,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";
import { clearAgentRegistry, getAgent } from "./agentRegistry";
import {
  getAgentConnectivityState,
  registerPrintAgent,
} from "./agentLifecycleService";
import {
  handleAgentWebSocketDisconnect,
  handleAgentWebSocketInboundMessage,
} from "./agentWebSocketInboundHandler";
import {
  buildAgentPrintResponseMessage,
  parseAgentWebSocketMessage,
  serializeAgentWebSocketMessage,
  AgentWebSocketMessageError,
} from "./agentWebSocketMessageCodec";
import {
  clearPendingRequests,
  DEFAULT_PENDING_REQUEST_TIMEOUT_MS,
  getPendingRequestCount,
  hasPendingRequest,
  registerPending,
  resolvePending,
  timeoutPending,
} from "./pendingRequestRegistry";
import { createPrintAgentCapabilities, createPrintAgentRequest } from "./printAgentProtocol";
import {
  createWebSocketAgentTransportChannel,
  WEBSOCKET_AGENT_TRANSPORT_CHANNEL_ID,
  WebSocketAgentTransportChannel,
} from "./webSocketAgentTransportChannel";

type MockConnection = AgentWebSocketConnection & {
  sent: string[];
};

function createMockConnection(
  readyState: AgentWebSocketReadyState = AgentWebSocketReadyState.OPEN
): MockConnection {
  const state = { readyState, sent: [] as string[] };

  return {
    get readyState() {
      return state.readyState;
    },
    sent: state.sent,
    send(data: string) {
      state.sent.push(data);
    },
    close() {
      state.readyState = AgentWebSocketReadyState.CLOSED;
    },
  };
}

function buildHelloMessage(input: {
  agentId: string;
  platform: "windows" | "android" | "ios";
}) {
  return serializeAgentWebSocketMessage({
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    agentId: input.agentId,
    platform: input.platform,
    capabilities: createPrintAgentCapabilities({
      platform: input.platform,
      transports: ["websocket"],
      printers: 1,
    }),
  });
}

function buildHeartbeatMessage(agentId: string, timestamp: string) {
  return serializeAgentWebSocketMessage({
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    agentId,
    timestamp,
  });
}

describe("agentConnectionManager THERMAL-PRINTING-6B", () => {
  beforeEach(() => {
    clearAgentConnections();
  });

  it("registers and resolves connections by agent id", () => {
    const connection = createMockConnection();
    registerConnection("agent-windows-1", connection);

    expect(getConnection("agent-windows-1")?.connection).toBe(connection);
    expect(listConnections()).toHaveLength(1);
  });

  it("removes connections on unregister", () => {
    registerConnection("agent-windows-1", createMockConnection());

    expect(unregisterConnection("agent-windows-1")).toBe(true);
    expect(getConnection("agent-windows-1")).toBeUndefined();
    expect(unregisterConnection("agent-windows-1")).toBe(false);
  });

  it("lists connections in sorted order", () => {
    registerConnection("agent-z", createMockConnection());
    registerConnection("agent-a", createMockConnection());

    expect(listConnections().map((entry) => entry.agentId)).toEqual(["agent-a", "agent-z"]);
  });
});

describe("pendingRequestRegistry THERMAL-PRINTING-6B", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPendingRequests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves pending requests by request id", async () => {
    const responsePromise = registerPending("req-1", { agentId: "agent-1" });

    expect(hasPendingRequest("req-1")).toBe(true);
    expect(
      resolvePending("req-1", {
        protocolVersion: "1.0",
        requestId: "req-1",
        accepted: true,
      })
    ).toBe(true);

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-1",
      accepted: true,
    });
    expect(getPendingRequestCount()).toBe(0);
  });

  it("times out pending requests after the default threshold", async () => {
    const responsePromise = registerPending("req-timeout", { agentId: "agent-1" });

    vi.advanceTimersByTime(DEFAULT_PENDING_REQUEST_TIMEOUT_MS + 1);

    await expect(responsePromise).rejects.toThrow("Print agent request timed out: req-timeout");
    expect(hasPendingRequest("req-timeout")).toBe(false);
  });

  it("supports explicit timeout handling", async () => {
    const responsePromise = registerPending("req-explicit", {
      agentId: "agent-1",
      timeoutMs: 1_000,
    });

    expect(timeoutPending("req-explicit")).toBe(true);
    await expect(responsePromise).rejects.toThrow("req-explicit");
  });
});

describe("agentWebSocketInboundHandler THERMAL-PRINTING-6B", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearAgentConnections();
    clearPendingRequests();
  });

  it("registers agents through hello messages using the 6A registry", () => {
    const connection = createMockConnection();

    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    expect(getAgent("agent-windows-1")?.registration.identity.platform).toBe("windows");
    expect(getAgent("agent-windows-1")?.capabilities?.transports).toEqual(["websocket"]);
    expect(getConnection("agent-windows-1")?.connection).toBe(connection);
    expect(getAgentConnectivityState("agent-windows-1")?.status).toBe("online");
  });

  it("supports android and ios hello registration without protocol changes", () => {
    const androidConnection = createMockConnection();
    const iosConnection = createMockConnection();

    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-android-1", platform: "android" }),
      androidConnection
    );
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-ios-1", platform: "ios" }),
      iosConnection
    );

    expect(getAgent("agent-android-1")?.registration.identity.platform).toBe("android");
    expect(getAgent("agent-ios-1")?.registration.identity.platform).toBe("ios");
  });

  it("updates heartbeats through the 6A lifecycle service", () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    handleAgentWebSocketInboundMessage(
      buildHeartbeatMessage("agent-windows-1", "2026-06-18T10:05:00.000Z"),
      connection
    );

    expect(getAgent("agent-windows-1")?.lastHeartbeatAt).toBe("2026-06-18T10:05:00.000Z");
  });

  it("resolves pending print responses by request id", async () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const responsePromise = registerPending("req-correlate", { agentId: "agent-windows-1" });
    handleAgentWebSocketInboundMessage(
      serializeAgentWebSocketMessage(
        buildAgentPrintResponseMessage({
          protocolVersion: "1.0",
          requestId: "req-correlate",
          accepted: true,
        })
      ),
      connection
    );

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-correlate",
      accepted: true,
    });
  });

  it("cleans up lifecycle and connection state on disconnect", () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    handleAgentWebSocketDisconnect("agent-windows-1");

    expect(getConnection("agent-windows-1")).toBeUndefined();
    expect(getAgent("agent-windows-1")).toBeUndefined();
    expect(getAgentConnectivityState("agent-windows-1")).toBeUndefined();
  });
});

describe("WebSocketAgentTransportChannel THERMAL-PRINTING-6B", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAgentRegistry();
    clearAgentConnections();
    clearPendingRequests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the websocket channel id", () => {
    const channel = new WebSocketAgentTransportChannel("agent-windows-1");
    expect(channel.channelId).toBe(WEBSOCKET_AGENT_TRANSPORT_CHANNEL_ID);
  });

  it("routes print requests over the registered connection", async () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    const request = createPrintAgentRequest({
      requestId: "req-route-1",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const responsePromise = channel.send(request);
    expect(connection.sent).toHaveLength(1);

    const wireMessage = JSON.parse(connection.sent[0]!) as {
      type: string;
      request: { requestId: string };
    };
    expect(wireMessage.type).toBe(AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST);
    expect(wireMessage.request.requestId).toBe("req-route-1");

    handleAgentWebSocketInboundMessage(
      serializeAgentWebSocketMessage(
        buildAgentPrintResponseMessage({
          protocolVersion: "1.0",
          requestId: "req-route-1",
          accepted: true,
        })
      ),
      connection
    );

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-route-1",
      accepted: true,
    });
  });

  it("preserves protocol version and request id in correlated responses", async () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    const request = createPrintAgentRequest({
      requestId: "req-preserve-1",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const responsePromise = channel.send(request);
    handleAgentWebSocketInboundMessage(
      serializeAgentWebSocketMessage(
        buildAgentPrintResponseMessage({
          protocolVersion: "1.0",
          requestId: "req-preserve-1",
          accepted: false,
          error: "Paper out",
        })
      ),
      connection
    );

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-preserve-1",
      accepted: false,
      error: "Paper out",
    });
  });

  it("returns a rejected response when the agent is not connected", async () => {
    registerPrintAgent({
      identity: {
        agentId: "agent-offline-1",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
    });

    const channel = createWebSocketAgentTransportChannel("agent-offline-1");
    const request = createPrintAgentRequest({
      requestId: "req-offline",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    await expect(channel.send(request)).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-offline",
      accepted: false,
      error: "Agent not connected",
    });
  });

  it("times out when no print response arrives", async () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const channel = createWebSocketAgentTransportChannel("agent-windows-1", 1_000);
    const request = createPrintAgentRequest({
      requestId: "req-timeout-channel",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const responsePromise = channel.send(request);
    vi.advanceTimersByTime(1_001);

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-timeout-channel",
      accepted: false,
      error: "Print agent request timed out: req-timeout-channel",
    });
  });

  it("does not maintain duplicate agent state outside the 6A registry", () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const registryAgent = getAgent("agent-windows-1");
    const connectivity = getAgentConnectivityState("agent-windows-1");

    expect(registryAgent).toBeDefined();
    expect(connectivity?.status).toBe("online");
    expect(listConnections()).toHaveLength(1);
    expect(listConnections()[0]?.agentId).toBe(registryAgent?.registration.identity.agentId);
  });

  it("rejects unsupported protocol versions on inbound messages", () => {
    const connection = createMockConnection();

    expect(() =>
      handleAgentWebSocketInboundMessage(
        JSON.stringify({
          type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
          protocolVersion: "9.9",
          agentId: "agent-windows-1",
          platform: "windows",
          capabilities: createPrintAgentCapabilities({
            platform: "windows",
            transports: ["websocket"],
            printers: 1,
          }),
        }),
        connection
      )
    ).toThrow(AgentWebSocketMessageError);
  });

  it("re-registers duplicate hello messages through the existing 6A registry", () => {
    const firstConnection = createMockConnection();
    const secondConnection = createMockConnection();

    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      firstConnection
    );
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      secondConnection
    );

    expect(getAgent("agent-windows-1")).toBeDefined();
    expect(getConnection("agent-windows-1")?.connection).toBe(secondConnection);
    expect(listConnections()).toHaveLength(1);
  });

  it("serializes print requests with the supported protocol version", async () => {
    const connection = createMockConnection();
    handleAgentWebSocketInboundMessage(
      buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }),
      connection
    );

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    const request = createPrintAgentRequest({
      requestId: "req-wire-1",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    void channel.send(request);
    const parsed = parseAgentWebSocketMessage(connection.sent[0]!);

    expect(parsed.protocolVersion).toBe(SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION);
    if (parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST) {
      expect(parsed.request.payloadBase64).toBe("G2QC");
    }
  });
});
