import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockAgentWebSocketClient } from "../transport/websocketClient";
import { validateDeploymentConfigFile } from "./validateDeploymentConfig";
import { bootAgentFromDeploymentConfig } from "./bootFromConfig";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import { MemoryIdentityStore } from "../identity/identityStore";

function buildDeploymentConfig() {
  return validateDeploymentConfigFile({
    agentId: "deployment-agent-1",
    agentName: "Deployment Agent",
    serverUrl: "ws://localhost/ws/print-agent",
    platform: "windows",
    startupPrinters: [
      {
        printerId: "pos-80c-copy-1-usb001",
        printerName: "POS-80C (copy 1)",
        transport: "usb",
        paperWidth: 80,
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
      },
    ],
    usbTransportEndpoints: {
      "pos-80c-copy-1-usb001": {
        kind: "windows-spooler",
        printerName: "POS-80C (copy 1)",
        portName: "USB001",
      },
    },
  });
}

describe("bootAgentFromDeploymentConfig THERMAL-PRINTING-12B", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("boots from deployment config and reports profiles on startup", async () => {
    const config = buildDeploymentConfig();
    const client = new MockAgentWebSocketClient();
    const identityStore = new MemoryIdentityStore();

    const runtime = await bootAgentFromDeploymentConfig(config, {
      client,
      identityStore,
    });

    expect(runtime.lifecycle.getState()).toBe("ready");
    expect(runtime.identity.agentId).toBe("deployment-agent-1");

    const types = client.sent.map((message) => JSON.parse(message).type);
    expect(types).toContain(AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO);
    expect(types).toContain(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT);
  });

  it("persists configured agentId in file-backed identity store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mineuqr-agent-identity-"));
    const config = {
      ...buildDeploymentConfig(),
      identityStorePath: join(dir, "identity.json"),
    };
    const client = new MockAgentWebSocketClient();

    const runtime = await bootAgentFromDeploymentConfig(config, { client });

    expect(runtime.identity.agentId).toBe("deployment-agent-1");
  });
});
