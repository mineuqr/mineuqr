import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEPLOYMENT_CONFIG_ENV, loadDeploymentConfig } from "./loadDeploymentConfig";

describe("loadDeploymentConfig THERMAL-PRINTING-12B", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads JSON file and applies environment overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mineuqr-agent-config-"));
    const configPath = join(dir, "agent.json");
    await writeFile(
      configPath,
      JSON.stringify({
        agentId: "file-agent",
        serverUrl: "wss://file.example.com/ws/print-agent",
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
      }),
      "utf8"
    );

    vi.stubEnv(DEPLOYMENT_CONFIG_ENV.SERVER_URL, "wss://override.example.com/ws/print-agent");
    vi.stubEnv(DEPLOYMENT_CONFIG_ENV.AGENT_ID, "override-agent");

    const config = await loadDeploymentConfig({ configPath });

    expect(config.serverUrl).toBe("wss://override.example.com/ws/print-agent");
    expect(config.agentId).toBe("override-agent");
  });
});
