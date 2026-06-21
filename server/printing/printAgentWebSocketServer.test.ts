import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  clearAgentConnections,
  getConnection,
  listConnections,
} from "./agentConnectionManager";
import { clearAgentRegistry, getAgent } from "./agentRegistry";
import { getAgentConnectivityState } from "./agentLifecycleService";
import {
  buildAgentPrintResponseMessage,
  serializeAgentWebSocketMessage,
} from "./agentWebSocketMessageCodec";
import {
  clearPendingRequests,
  getPendingRequestCount,
  hasPendingRequest,
} from "./pendingRequestRegistry";
import { createPrintAgentCapabilities, createPrintAgentRequest } from "./printAgentProtocol";
import {
  attachPrintAgentWebSocketServer,
  PRINT_AGENT_WEBSOCKET_PATH,
} from "./printAgentWebSocketServer";
import { createWebSocketAgentTransportChannel } from "./webSocketAgentTransportChannel";

const opsLogMock = vi.fn();

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

function buildHelloMessage(input: {
  agentId: string;
  platform: "windows" | "android" | "ios";
  protocolVersion?: string;
}) {
  return serializeAgentWebSocketMessage({
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
    protocolVersion: input.protocolVersion ?? SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
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

async function startPrintAgentTestServer(): Promise<{ httpServer: Server; port: number }> {
  const httpServer = createServer((_request, response) => {
    response.writeHead(200);
    response.end("ok");
  });
  attachPrintAgentWebSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind print agent test server");
  }

  return { httpServer, port: address.port };
}

async function connectPrintAgentClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(`ws://127.0.0.1:${port}${PRINT_AGENT_WEBSOCKET_PATH}`);
    client.once("open", () => resolve(client));
    client.once("error", reject);
  });
}

async function closePrintAgentClient(client: WebSocket): Promise<void> {
  if (client.readyState === WebSocket.CLOSED) {
    return;
  }

  await new Promise<void>((resolve) => {
    client.once("close", () => resolve());
    client.close();
  });
}

describe("printAgentWebSocketServer THERMAL-PRINTING-6C", () => {
  let httpServer: Server | undefined;
  let port = 0;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentConnections();
    clearPendingRequests();

    const started = await startPrintAgentTestServer();
    httpServer = started.httpServer;
    port = started.port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      httpServer?.close(() => resolve());
    });
  });

  it("accepts websocket connections on the print agent endpoint", async () => {
    const client = await connectPrintAgentClient(port);
    expect(client.readyState).toBe(WebSocket.OPEN);
    await closePrintAgentClient(client);
  });

  it("logs print_agent_connected when a client connects", async () => {
    const client = await connectPrintAgentClient(port);

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.print_agent_connected })
    );

    await closePrintAgentClient(client);
  });

  it("registers agents through inbound hello using the 6A lifecycle", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-1")).toBeDefined());

    expect(getAgent("agent-windows-1")?.registration.identity.platform).toBe("windows");
    expect(getConnection("agent-windows-1")).toBeDefined();
    expect(getAgentConnectivityState("agent-windows-1")?.status).toBe("online");

    await closePrintAgentClient(client);
  });

  it("supports android and ios hello registration", async () => {
    const android = await connectPrintAgentClient(port);
    android.send(buildHelloMessage({ agentId: "agent-android-1", platform: "android" }));

    const ios = await connectPrintAgentClient(port);
    ios.send(buildHelloMessage({ agentId: "agent-ios-1", platform: "ios" }));

    await vi.waitFor(() => expect(getAgent("agent-android-1")).toBeDefined());
    await vi.waitFor(() => expect(getAgent("agent-ios-1")).toBeDefined());

    await closePrintAgentClient(android);
    await closePrintAgentClient(ios);
  });

  it("updates heartbeat state through recordAgentHeartbeat", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-1")).toBeDefined());

    client.send(buildHeartbeatMessage("agent-windows-1", "2026-06-18T10:05:00.000Z"));
    await vi.waitFor(() =>
      expect(getAgent("agent-windows-1")?.lastHeartbeatAt).toBe("2026-06-18T10:05:00.000Z")
    );

    await closePrintAgentClient(client);
  });

  it("routes print requests and correlates responses through the live channel", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeDefined());

    const incomingPrintRequest = new Promise<void>((resolve) => {
      client.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString()) as {
          type?: string;
          request?: { requestId: string };
        };
        if (
          parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST &&
          parsed.request?.requestId === "req-live-1"
        ) {
          client.send(
            serializeAgentWebSocketMessage(
              buildAgentPrintResponseMessage({
                protocolVersion: "1.0",
                requestId: "req-live-1",
                accepted: true,
              })
            )
          );
          resolve();
        }
      });
    });

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    const responsePromise = channel.send(
      createPrintAgentRequest({
        requestId: "req-live-1",
        printJobId: 100,
        restaurantId: 1,
        payloadBase64: "G2QC",
      })
    );

    await incomingPrintRequest;
    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-live-1",
      accepted: true,
    });

    await closePrintAgentClient(client);
  });

  it("cleans up registry, connection, and pending requests on disconnect", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeDefined());

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    void channel.send(
      createPrintAgentRequest({
        requestId: "req-disconnect",
        printJobId: 100,
        restaurantId: 1,
        payloadBase64: "G2QC",
      })
    );
    await vi.waitFor(() => expect(hasPendingRequest("req-disconnect")).toBe(true));

    await closePrintAgentClient(client);
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeUndefined());

    expect(getAgent("agent-windows-1")).toBeUndefined();
    expect(getPendingRequestCount()).toBe(0);
  });

  it("logs print_agent_disconnected on close", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-1")).toBeDefined());

    await closePrintAgentClient(client);

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.print_agent_disconnected,
          metadata: expect.objectContaining({ agentId: "agent-windows-1" }),
        })
      )
    );
  });

  it("rejects malformed JSON without crashing the server", async () => {
    const first = await connectPrintAgentClient(port);
    first.send("{not-json");

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.print_agent_message_rejected })
      )
    );

    const second = await connectPrintAgentClient(port);
    second.send(buildHelloMessage({ agentId: "agent-windows-2", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-2")).toBeDefined());

    await closePrintAgentClient(first);
    await closePrintAgentClient(second);
  });

  it("rejects protocol version mismatches", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(
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
      })
    );

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.print_agent_message_rejected,
          metadata: expect.objectContaining({
            rejectedMalformed: true,
          }),
        })
      )
    );

    expect(getAgent("agent-windows-1")).toBeUndefined();
    await closePrintAgentClient(client);
  });

  it("rejects unknown message types safely", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(
      JSON.stringify({
        type: "agent.unknown",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      })
    );

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.print_agent_message_rejected })
      )
    );

    await closePrintAgentClient(client);
  });

  it("rejects binary websocket frames", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(Buffer.from([1, 2, 3]));

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.print_agent_message_rejected,
          metadata: expect.objectContaining({
            reason: "binary_messages_not_supported",
          }),
        })
      )
    );

    await closePrintAgentClient(client);
  });

  it("logs print_agent_message_received for valid inbound messages", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));

    await vi.waitFor(() =>
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.print_agent_message_received })
      )
    );

    await closePrintAgentClient(client);
  });

  it("handles duplicate disconnects without crashing", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-1")).toBeDefined());

    client.terminate();
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeUndefined());

    expect(() => client.terminate()).not.toThrow();
    expect(getAgent("agent-windows-1")).toBeUndefined();
  });

  it("supports multiple connected agents concurrently", async () => {
    const first = await connectPrintAgentClient(port);
    const second = await connectPrintAgentClient(port);

    first.send(buildHelloMessage({ agentId: "agent-a", platform: "windows" }));
    second.send(buildHelloMessage({ agentId: "agent-b", platform: "android" }));

    await vi.waitFor(() => expect(listConnections()).toHaveLength(2));
    expect(getAgent("agent-a")).toBeDefined();
    expect(getAgent("agent-b")).toBeDefined();

    await closePrintAgentClient(first);
    await closePrintAgentClient(second);
  });

  it("returns rejected responses for disconnected agents", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeDefined());
    await closePrintAgentClient(client);
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeUndefined());

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    await expect(
      channel.send(
        createPrintAgentRequest({
          requestId: "req-offline",
          printJobId: 100,
          restaurantId: 1,
          payloadBase64: "G2QC",
        })
      )
    ).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-offline",
      accepted: false,
      error: "Agent not connected",
    });
  });

  it("does not create duplicate lifecycle state outside the 6A registry", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getAgent("agent-windows-1")).toBeDefined());

    expect(getAgentConnectivityState("agent-windows-1")?.status).toBe("online");
    expect(listConnections()).toHaveLength(1);
    expect(getAgent("agent-windows-1")?.capabilities?.platform).toBe("windows");

    await closePrintAgentClient(client);
  });

  it("disconnects cleanly when hello was never sent", async () => {
    const client = await connectPrintAgentClient(port);
    await closePrintAgentClient(client);

    expect(listConnections()).toHaveLength(0);
    expect(getAgentConnectivityState("agent-windows-1")).toBeUndefined();
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.print_agent_disconnected })
    );
  });

  it("survives one failing client while another remains healthy", async () => {
    const bad = await connectPrintAgentClient(port);
    const good = await connectPrintAgentClient(port);

    bad.send("{bad-json");
    good.send(buildHelloMessage({ agentId: "agent-good", platform: "windows" }));

    await vi.waitFor(() => expect(getAgent("agent-good")).toBeDefined());
    expect(getConnection("agent-good")).toBeDefined();

    await closePrintAgentClient(bad);
    await closePrintAgentClient(good);
  });

  it("aborts in-flight print requests when the agent disconnects", async () => {
    const client = await connectPrintAgentClient(port);
    client.send(buildHelloMessage({ agentId: "agent-windows-1", platform: "windows" }));
    await vi.waitFor(() => expect(getConnection("agent-windows-1")).toBeDefined());

    const channel = createWebSocketAgentTransportChannel("agent-windows-1");
    const responsePromise = channel.send(
      createPrintAgentRequest({
        requestId: "req-abort",
        printJobId: 100,
        restaurantId: 1,
        payloadBase64: "G2QC",
      })
    );

    await vi.waitFor(() => expect(hasPendingRequest("req-abort")).toBe(true));
    await closePrintAgentClient(client);

    await expect(responsePromise).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "req-abort",
      accepted: false,
      error: "Agent disconnected: agent-windows-1",
    });
  });
});
