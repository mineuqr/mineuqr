import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "../../shared/printing/executionContext";
import type { LocalJobPrepareContext } from "./executionTypes";

describe("execution naming resolution THERMAL-PRINTING-10A", () => {
  it("H — local prepare context is distinct from shared 9C execution context", () => {
    const local: LocalJobPrepareContext = {
      jobId: 100,
      restaurantId: 7,
      printerId: 10,
      orderId: 500,
      ticketItemCount: 2,
      normalizedAt: "2026-06-18T10:00:00.000Z",
    };

    const shared: ExecutionContext = {
      platform: { identity: "windows" },
      capabilities: {
        supportedMethods: ["raw-escpos"],
        supportedTransports: ["usb"],
        supportsEscPos: true,
        supportsLocalExecution: true,
      },
      availability: {
        availableTransports: ["usb"],
        hasPlatformCapabilityReport: true,
        printerTransportAvailable: true,
      },
      printer: {
        printerId: "kitchen-printer",
        printerName: "Kitchen",
        transport: "usb",
        escposCapable: true,
        airprintCapable: false,
        vendorSdkCapable: false,
        paperWidth: 80,
      },
      agent: {
        agentId: "agent-1",
        platform: "windows",
        protocolVersion: "1.0",
        connectedAt: "2026-06-18T10:00:00.000Z",
        platformConsistent: true,
      },
    };

    expect(local).not.toHaveProperty("capabilities");
    expect(shared).not.toHaveProperty("ticketItemCount");
    expect(local.jobId).toBe(100);
    expect(shared.agent.agentId).toBe("agent-1");
  });
});
