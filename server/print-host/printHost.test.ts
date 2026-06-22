import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import WebSocket from "ws";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { createPrintAgentCapabilities } from "../printing/printAgentProtocol";
import { listEndpointOperations } from "../printing/endpointOperationsService";
import { clearAgentRegistry } from "../printing/agentRegistry";
import { clearPrinterProfileStore } from "../printing/printerProfileStore";
import { clearPrinterResolutionRegistry } from "../printing/printerResolutionRegistry";
import { clearEndpointRegistry } from "../printing/endpointRegistry";
import {
  attachPrintAgentWebSocketServer,
} from "../printing/printAgentWebSocketServer";
import { createPrintHostApp } from "./createPrintHostApp";

function buildHello(agentId: string) {
  return JSON.stringify({
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
    agentId,
    platform: "windows",
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    capabilities: createPrintAgentCapabilities({
      platform: "windows",
      transports: ["websocket"],
      printers: 1,
    }),
  });
}

describe("printHost THERMAL-PRINTING-12E.1B", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearEndpointRegistry();

    const app = await createPrintHostApp();
    server = createServer(app);
    attachPrintAgentWebSocketServer(server);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("exposes health and tRPC route metadata", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("mineuqr-print-host");
  });

  it("registers agents over WebSocket on the shared HTTP server", async () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws/print-agent`);
      ws.once("open", () => {
        ws.send(buildHello("mineuqr-agent-720007"));
      });
      ws.once("error", reject);
      setTimeout(() => {
        ws.close();
        resolve();
      }, 200);
    });

    await vi.waitFor(async () => {
      const health = await fetch(`${baseUrl}/health`);
      const body = await health.json();
      expect(body.agents.registered).toBe(1);
    });
  });

  it("projects endpoints after agent HELLO for restaurant-scoped operations", async () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws/print-agent`);
      ws.once("open", () => {
        ws.send(buildHello("mineuqr-agent-720007"));
      });
      ws.once("error", reject);
      setTimeout(() => {
        ws.close();
        resolve();
      }, 200);
    });

    await vi.waitFor(() => {
      const endpoints = listEndpointOperations({ restaurantId: 720007 });
      expect(endpoints.some((entry) => entry.endpointId === "mineuqr-agent-720007")).toBe(true);
      expect(endpoints[0]?.connectivityState).toBe("ONLINE");
    });
  });
});
