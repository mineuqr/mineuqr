import { describe, expect, it } from "vitest";
import { buildPrintAgentConnectConfig } from "./printAgentConnectConfig";
import { buildSuggestedPrintAgentId, buildSystemPrinterProfileId } from "./printerProfileId";

describe("printerProfileId THERMAL-PRINTING-13I.1J", () => {
  it("builds restaurant-scoped agent id", () => {
    expect(buildSuggestedPrintAgentId(720002)).toBe("mineuqr-agent-720002");
  });

  it("builds system-managed profile ids", () => {
    const profileId = buildSystemPrinterProfileId(720002);
    expect(profileId).toMatch(/^r720002-printer-[a-z0-9]{10}$/);
  });
});

describe("printAgentConnectConfig THERMAL-PRINTING-13I.1J", () => {
  it("builds operator-ready agent configuration from db printers", () => {
    const config = buildPrintAgentConnectConfig(720002, [
      {
        id: 1,
        name: "Kitchen Printer",
        profileId: "r720002-printer-abc1234567",
        paperWidthMm: 80,
      },
    ]);

    expect(config.agentId).toBe("mineuqr-agent-720002");
    expect(config.startupPrinters).toEqual([
      expect.objectContaining({
        printerId: "r720002-printer-abc1234567",
        printerName: "Kitchen Printer",
        paperWidth: 80,
      }),
    ]);
    expect(config.usbTransportEndpoints).toEqual({
      "r720002-printer-abc1234567": expect.objectContaining({
        kind: "windows-spooler",
        printerName: "Kitchen Printer",
      }),
    });
  });
});
