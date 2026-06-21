import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import { AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES } from "../../shared/printing/platformCapabilities";
import { MemoryIdentityStore } from "../identity/identityStore";
import { MockAgentWebSocketClient } from "../transport/websocketClient";
import { bootAgent, createMockAgentRuntime } from "./boot";
import { shutdownAgent } from "./shutdown";

describe("agent boot/shutdown THERMAL-PRINTING-6D", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("boots through starting → connecting → registering → ready", async () => {
    const store = new MemoryIdentityStore();
    const { client, boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      heartbeatIntervalMs: 1_000,
    });

    const runtime = await boot();

    expect(runtime.lifecycle.getState()).toBe("ready");
    expect(runtime.identity.agentName).toBe("Kitchen Printer");
    expect(client.sent.some((message) => {
      const parsed = JSON.parse(message) as { type?: string };
      return parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO;
    })).toBe(true);
  });

  it("reports printer profiles and platform capabilities after hello", async () => {
    const store = new MemoryIdentityStore();
    const { client, boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      startupPrinters: [
        {
          printerId: "kitchen-printer",
          printerName: "Kitchen",
          transport: "usb",
          capabilities: {
            escpos: true,
            cutter: false,
            cashDrawer: false,
            qrCode: true,
            imagePrinting: false,
          },
          executionCapabilities: {
            airprint: false,
            vendorSdk: false,
          },
          paperWidth: 80,
        },
      ],
    });

    await boot();

    const types = client.sent.map((message) => JSON.parse(message).type);
    expect(types[0]).toBe(AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO);
    expect(types).toContain(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT);
    expect(types).toContain(AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT);
    expect(types.indexOf(AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO)).toBeLessThan(
      types.indexOf(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT)
    );
    expect(
      types.indexOf(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT)
    ).toBeLessThan(types.indexOf(AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT));
  });

  it("reuses persisted identity across boots", async () => {
    const store = new MemoryIdentityStore();
    const config = {
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows" as const,
      identityStore: store,
    };

    const first = await bootAgent({
      ...config,
      client: new MockAgentWebSocketClient(),
    });
    await shutdownAgent(first);

    const second = await bootAgent({
      ...config,
      client: new MockAgentWebSocketClient(),
    });

    expect(second.identity.agentId).toBe(first.identity.agentId);
  });

  it("starts heartbeats after reaching ready", async () => {
    const store = new MemoryIdentityStore();
    const { boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      heartbeatIntervalMs: 1_000,
    });

    const runtime = await boot();
    expect(runtime.heartbeat.isRunning()).toBe(true);

    vi.advanceTimersByTime(1_000);
    expect(runtime.client).toBeDefined();
  });

  it("shuts down gracefully to offline", async () => {
    const store = new MemoryIdentityStore();
    const { boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
    });

    const runtime = await boot();
    await shutdownAgent(runtime);

    expect(runtime.lifecycle.getState()).toBe("offline");
    expect(runtime.heartbeat.isRunning()).toBe(false);
    expect(runtime.reconnect.isStopped()).toBe(true);
  });

  it("transitions to reconnecting after disconnect and re-registers", async () => {
    const store = new MemoryIdentityStore();
    const { client, boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      reconnectInitialDelayMs: 1_000,
    });

    const runtime = await boot();
    const helloCountBefore = client.sent.filter((message) => {
      const parsed = JSON.parse(message) as { type?: string };
      return parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO;
    }).length;

    client.simulateDisconnect();
    expect(runtime.lifecycle.getState()).toBe("reconnecting");

    vi.advanceTimersByTime(1_000);
    await Promise.resolve();

    const helloCountAfter = client.sent.filter((message) => {
      const parsed = JSON.parse(message) as { type?: string };
      return parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO;
    }).length;

    expect(helloCountAfter).toBeGreaterThan(helloCountBefore);
    expect(runtime.lifecycle.getState()).toBe("ready");
  });
});
