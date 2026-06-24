import { describe, expect, it } from "vitest";
import { validateDeploymentConfigFile } from "../../agent/config/validateDeploymentConfig";
import { buildPrintAgentConnectConfig, CONNECT_CONFIG_BINDING_MODEL } from "./printAgentConnectConfig";
import { buildSuggestedPrintAgentId, buildSystemPrinterProfileId } from "./printerProfileId";

const connectPrinterRow = {
  id: 1,
  name: "Kitchen Printer",
  profileId: "r720002-printer-abc1234567",
  paperWidthMm: 80,
};

describe("printerProfileId THERMAL-PRINTING-13I.1J", () => {
  it("builds restaurant-scoped agent id", () => {
    expect(buildSuggestedPrintAgentId(720002)).toBe("mineuqr-agent-720002");
  });

  it("builds system-managed profile ids", () => {
    const profileId = buildSystemPrinterProfileId(720002);
    expect(profileId).toMatch(/^r720002-printer-[a-z0-9]{10}$/);
  });
});

describe("printAgentConnectConfig THERMAL-PRINTING-13I.2E.1", () => {
  it("builds logical-only provisioning config with pending physical bindings", () => {
    const config = buildPrintAgentConnectConfig(720002, [connectPrinterRow]);

    expect(config.bindingModel).toBe(CONNECT_CONFIG_BINDING_MODEL);
    expect(config.agentId).toBe("mineuqr-agent-720002");
    expect(config.startupPrinters).toEqual([
      expect.objectContaining({
        printerId: "r720002-printer-abc1234567",
        printerName: "Kitchen Printer",
        paperWidth: 80,
      }),
    ]);
    expect(config.physicalBindings).toEqual({
      "r720002-printer-abc1234567": {
        bindingStatus: "pending",
        logicalPrinterId: "r720002-printer-abc1234567",
        logicalPrinterName: "Kitchen Printer",
        transportKind: "windows-spooler",
        dbPrinterId: 1,
      },
    });
    expect(config.usbTransportEndpoints).toEqual({});
  });

  it("produces agent-valid config without authoritative spooler bindings", () => {
    const config = buildPrintAgentConnectConfig(720002, [connectPrinterRow]);
    const validated = validateDeploymentConfigFile(config);

    expect(validated.startupPrinters).toHaveLength(1);
    expect(validated.usbTransportEndpoints).toEqual({});
    expect(validated.physicalBindings?.["r720002-printer-abc1234567"]?.bindingStatus).toBe(
      "pending"
    );
  });
});
