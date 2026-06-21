import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AGENT_STALE_THRESHOLD_MS } from "../../shared/printing/agentHeartbeat";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  clearAgentRegistry,
  getAgent,
  listAgents,
  registerAgent,
  AgentRegistryError,
  unregisterAgent,
} from "./agentRegistry";
import {
  calculateAgentStatus,
  isAgentStale,
} from "../../shared/printing/agentHeartbeat";
import {
  getAgentConnectivityState,
  listAgentConnectivityStates,
  recordAgentHeartbeat,
  registerPrintAgent,
  unregisterPrintAgent,
  AgentLifecycleError,
} from "./agentLifecycleService";
import { createPrintAgentCapabilities } from "./printAgentProtocol";

const windowsIdentity = {
  agentId: "agent-windows-1",
  platform: "windows" as const,
  protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
};

const androidIdentity = {
  agentId: "agent-android-1",
  platform: "android" as const,
  protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
};

describe("agentRegistry THERMAL-PRINTING-6A", () => {
  beforeEach(() => {
    clearAgentRegistry();
  });

  it("registers an agent with identity and connectedAt", () => {
    const connectedAt = "2026-06-18T10:00:00.000Z";
    const registration = registerAgent({
      identity: windowsIdentity,
      connectedAt,
    });

    expect(registration).toEqual({
      identity: windowsIdentity,
      connectedAt,
    });
    expect(getAgent(windowsIdentity.agentId)?.lastHeartbeatAt).toBe(connectedAt);
  });

  it("handles duplicate registration by replacing the existing agent", () => {
    registerAgent({
      identity: windowsIdentity,
      connectedAt: "2026-06-18T10:00:00.000Z",
    });

    const replacement = registerAgent({
      identity: windowsIdentity,
      connectedAt: "2026-06-18T11:00:00.000Z",
      capabilities: createPrintAgentCapabilities({
        platform: "windows",
        transports: ["usb"],
        printers: 2,
      }),
    });

    expect(replacement.connectedAt).toBe("2026-06-18T11:00:00.000Z");
    expect(listAgents()).toHaveLength(1);
    expect(getAgent(windowsIdentity.agentId)?.capabilities?.printers).toBe(2);
  });

  it("unregisters agents and reports missing agents as absent", () => {
    registerAgent({ identity: windowsIdentity });

    expect(unregisterAgent(windowsIdentity.agentId)).toBe(true);
    expect(getAgent(windowsIdentity.agentId)).toBeUndefined();
    expect(unregisterAgent(windowsIdentity.agentId)).toBe(false);
  });

  it("lists registered agents in sorted order", () => {
    registerAgent({ identity: windowsIdentity });
    registerAgent({ identity: androidIdentity });

    expect(listAgents().map((agent) => agent.registration.identity.agentId)).toEqual([
      androidIdentity.agentId,
      windowsIdentity.agentId,
    ]);
  });

  it("stores capabilities on registration without changing protocol contracts", () => {
    const capabilities = createPrintAgentCapabilities({
      platform: "ios",
      transports: ["airprint"],
      printers: 1,
    });

    registerAgent({
      identity: {
        agentId: "agent-ios-1",
        platform: "ios",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      capabilities,
    });

    expect(getAgent("agent-ios-1")?.capabilities).toEqual(capabilities);
  });

  it("rejects invalid agent ids", () => {
    expect(() =>
      registerAgent({
        identity: {
          ...windowsIdentity,
          agentId: "   ",
        },
      })
    ).toThrow(AgentRegistryError);
  });
});

describe("agentHeartbeat THERMAL-PRINTING-6A", () => {
  it("treats missing heartbeats as stale", () => {
    expect(isAgentStale(undefined)).toBe(true);
  });

  it("detects stale agents after the default threshold", () => {
    const lastHeartbeatAt = "2026-06-18T10:00:00.000Z";
    const now = new Date(
      new Date(lastHeartbeatAt).getTime() + DEFAULT_AGENT_STALE_THRESHOLD_MS + 1
    );

    expect(isAgentStale(lastHeartbeatAt, { now })).toBe(true);
  });

  it("keeps recent heartbeats online", () => {
    const lastHeartbeatAt = "2026-06-18T10:00:00.000Z";
    const now = new Date(
      new Date(lastHeartbeatAt).getTime() + DEFAULT_AGENT_STALE_THRESHOLD_MS
    );

    expect(isAgentStale(lastHeartbeatAt, { now })).toBe(false);
    expect(
      calculateAgentStatus({
        isRegistered: true,
        lastHeartbeatAt,
        now,
      })
    ).toBe("online");
  });

  it("returns offline for unregistered agents", () => {
    expect(
      calculateAgentStatus({
        isRegistered: false,
        lastHeartbeatAt: "2026-06-18T10:00:00.000Z",
      })
    ).toBe("offline");
  });

  it("returns stale for registered agents with expired heartbeats", () => {
    const lastHeartbeatAt = "2026-06-18T10:00:00.000Z";
    const now = new Date(
      new Date(lastHeartbeatAt).getTime() + DEFAULT_AGENT_STALE_THRESHOLD_MS + 1
    );

    expect(
      calculateAgentStatus({
        isRegistered: true,
        lastHeartbeatAt,
        now,
      })
    ).toBe("stale");
  });
});

describe("agentLifecycleService THERMAL-PRINTING-6A", () => {
  beforeEach(() => {
    clearAgentRegistry();
  });

  it("registers agents through the lifecycle service", () => {
    const registration = registerPrintAgent({ identity: windowsIdentity });

    expect(registration.identity).toEqual(windowsIdentity);
    expect(getAgentConnectivityState(windowsIdentity.agentId)?.status).toBe("online");
  });

  it("updates heartbeat timestamps for registered agents", () => {
    registerPrintAgent({
      identity: windowsIdentity,
      connectedAt: "2026-06-18T10:00:00.000Z",
    });

    recordAgentHeartbeat({
      agentId: windowsIdentity.agentId,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      timestamp: "2026-06-18T10:04:00.000Z",
    });

    expect(getAgent(windowsIdentity.agentId)?.lastHeartbeatAt).toBe(
      "2026-06-18T10:04:00.000Z"
    );
  });

  it("rejects heartbeat updates for unknown agents", () => {
    expect(() =>
      recordAgentHeartbeat({
        agentId: "missing-agent",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: "2026-06-18T10:04:00.000Z",
      })
    ).toThrow(AgentLifecycleError);
  });

  it("transitions connectivity state from online to stale", () => {
    registerPrintAgent({
      identity: windowsIdentity,
      connectedAt: "2026-06-18T10:00:00.000Z",
    });

    const staleNow = new Date(
      new Date("2026-06-18T10:00:00.000Z").getTime() +
        DEFAULT_AGENT_STALE_THRESHOLD_MS +
        1
    );

    expect(
      getAgentConnectivityState(windowsIdentity.agentId, { now: staleNow })
    ).toEqual({
      agentId: windowsIdentity.agentId,
      status: "stale",
      lastHeartbeatAt: "2026-06-18T10:00:00.000Z",
    });
  });

  it("returns undefined connectivity state after unregister", () => {
    registerPrintAgent({ identity: windowsIdentity });

    expect(unregisterPrintAgent(windowsIdentity.agentId)).toBe(true);
    expect(getAgentConnectivityState(windowsIdentity.agentId)).toBeUndefined();
  });

  it("lists connectivity states for all registered agents", () => {
    registerPrintAgent({ identity: windowsIdentity });
    registerPrintAgent({ identity: androidIdentity });

    expect(listAgentConnectivityStates().map((state) => state.agentId)).toEqual([
      androidIdentity.agentId,
      windowsIdentity.agentId,
    ]);
    expect(listAgentConnectivityStates().every((state) => state.status === "online")).toBe(
      true
    );
  });

  it("refreshes stale state back to online after a new heartbeat", () => {
    registerPrintAgent({
      identity: windowsIdentity,
      connectedAt: "2026-06-18T10:00:00.000Z",
    });

    const staleNow = new Date(
      new Date("2026-06-18T10:00:00.000Z").getTime() +
        DEFAULT_AGENT_STALE_THRESHOLD_MS +
        1
    );
    expect(
      getAgentConnectivityState(windowsIdentity.agentId, { now: staleNow })?.status
    ).toBe("stale");

    recordAgentHeartbeat({
      agentId: windowsIdentity.agentId,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      timestamp: "2026-06-18T10:10:00.000Z",
    });

    expect(getAgentConnectivityState(windowsIdentity.agentId, { now: staleNow })?.status).toBe(
      "online"
    );
  });

  it("supports all platform identities without changing protocol contracts", () => {
    const iosRegistration = registerPrintAgent({
      identity: {
        agentId: "agent-ios-1",
        platform: "ios",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      capabilities: createPrintAgentCapabilities({
        platform: "ios",
        transports: ["airprint"],
        printers: 1,
      }),
    });

    expect(iosRegistration.identity.platform).toBe("ios");
    expect(getAgent("agent-ios-1")?.capabilities?.platform).toBe("ios");
  });
});
