import { describe, expect, it } from "vitest";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import {
  buildPrinterProfilesReportMessage,
  reportPrinterProfiles,
  PrinterProfilesReportTracker,
} from "./reportPrinterProfiles";

const sampleProfile = {
  printerId: "printer-1",
  printerName: "Kitchen USB",
  transport: "usb" as const,
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
  paperWidth: 80 as const,
};

describe("reportPrinterProfiles THERMAL-PRINTING-7F.2", () => {
  it("builds printer inventory report messages", () => {
    expect(
      buildPrinterProfilesReportMessage({
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [sampleProfile],
      })
    ).toMatchObject({
      type: AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT,
      agentId: "agent-123",
      printers: [sampleProfile],
    });
  });

  it("reports inventory once per identical snapshot", () => {
    const sent: string[] = [];
    const tracker = new PrinterProfilesReportTracker();

    const first = reportPrinterProfiles({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [sampleProfile],
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const duplicate = reportPrinterProfiles({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:01.000Z",
        printers: [sampleProfile],
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
