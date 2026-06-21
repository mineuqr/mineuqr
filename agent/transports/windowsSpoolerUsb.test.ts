import { describe, expect, it } from "vitest";
import { createRawEscPosExecutor } from "../execution/executors/rawEscPosExecutor";
import { executeAgentTransportDelivery } from "../execution/executeTransportDelivery";
import { JobConsumptionService } from "../consumption/jobConsumptionService";
import { MemoryAgentJobClient } from "../jobs/jobClient";
import {
  AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES,
} from "../../shared/printing/executionOutcomeMessages";
import { classifyExecutionOutcome } from "../../shared/printing/executionOutcomeReporting";
import { resolveExecutionOutcome } from "../../shared/printing/executionOutcome";
import {
  MemoryTcpSocketClientFactory,
} from "./tcpSocketClient";
import { createAgentTransportRegistry } from "./transportRegistry";
import { createUsbTransportAdapter } from "./usbTransportAdapter";
import { MemoryUsbDeviceClient } from "./usbDeviceClient";
import { MemoryBluetoothDeviceClient } from "./bluetoothDeviceClient";
import {
  MemoryWindowsSpoolerDeviceClient,
  WindowsSpoolerDeviceClientError,
} from "./windowsSpoolerDeviceClient";

const transportContext = {
  executionContext: {
    platform: { identity: "windows" as const },
    capabilities: {
      supportedMethods: ["raw-escpos" as const],
      supportedTransports: ["usb"] as const,
      supportsEscPos: true,
      supportsLocalExecution: true,
    },
    availability: {
      availableTransports: ["usb"] as const,
      hasPlatformCapabilityReport: true,
      printerTransportAvailable: true,
    },
    printer: {
      printerId: "pos-80c-printer",
      printerName: "POS-80C",
      transport: "usb" as const,
      escposCapable: true,
      airprintCapable: false,
      vendorSdkCapable: false,
      paperWidth: 80 as const,
    },
    agent: {
      agentId: "agent-123",
      platform: "windows" as const,
      protocolVersion: "1.0",
      connectedAt: "2026-06-18T10:00:00.000Z",
      platformConsistent: true,
    },
  },
  printerProfile: {
    printerId: "pos-80c-printer",
    printerName: "POS-80C",
    transport: "usb" as const,
    capabilities: {
      escpos: true,
      cutter: false,
      cashDrawer: false,
      qrCode: false,
      imagePrinting: false,
    },
    executionCapabilities: {
      airprint: false,
      vendorSdk: false,
    },
    paperWidth: 80 as const,
  },
};

function completedExecutionResult() {
  return createRawEscPosExecutor().execute({
    executionPlan: {
      platform: "windows",
      contextBuilt: true,
      strategyResolved: true,
      method: "raw-escpos",
    },
    job: {
      jobId: 100,
      restaurantId: 7,
      printerId: 10,
      orderId: 500,
      ticket: {
        orderId: 500,
        restaurantId: 7,
        items: [{ itemName: "Burger", quantity: 1 }],
      },
    },
  });
}

function buildTransportRequest(
  overrides: Partial<Parameters<typeof executeAgentTransportDelivery>[0]> = {}
) {
  return {
    executionResult: completedExecutionResult(),
    executionPlan: {
      platform: "windows" as const,
      contextBuilt: true,
      strategyResolved: true,
      method: "raw-escpos" as const,
    },
    executionContext: transportContext.executionContext,
    printerProfile: transportContext.printerProfile,
    ...overrides,
  };
}

function createMemoryClients(input?: {
  spooler?: MemoryWindowsSpoolerDeviceClient;
  usb?: MemoryUsbDeviceClient;
  retryPolicy?: { maxAttempts: number; delayMs: number };
}) {
  return {
    tcpSocketFactory: new MemoryTcpSocketClientFactory(),
    usbDeviceClient: input?.usb ?? new MemoryUsbDeviceClient(),
    windowsSpoolerDeviceClient: input?.spooler ?? new MemoryWindowsSpoolerDeviceClient(),
    bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
    retryPolicy: input?.retryPolicy,
  };
}

describe("windowsSpoolerUsb THERMAL-PRINTING-WINDOWS-USB-2", () => {
  it("B — device-path mode unchanged", async () => {
    const usbClient = new MemoryUsbDeviceClient();
    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: { kind: "device-path", devicePath: "\\\\.\\COM3" },
      }),
      createMemoryClients({ usb: usbClient })
    );

    expect(result.status).toBe("completed");
    expect(usbClient.writer.writes[0]?.devicePath).toBe("\\\\.\\COM3");
  });

  it("D — windows spooler client success delivers RAW bytes", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler })
    );

    expect(result.status).toBe("completed");
    expect(spooler.writes).toEqual([
      {
        printerName: "POS-80C",
        portName: "USB001",
        bytes: expect.any(Uint8Array),
      },
    ]);
    expect(spooler.writes[0]?.bytes.byteLength).toBeGreaterThan(0);
  });

  it("E — printer not found maps to connection-failed", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("OTHER", "USB002");

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler, retryPolicy: { maxAttempts: 1, delayMs: 0 } })
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("connection-failed");
    expect(result.message).toMatch(/not found/i);
  });

  it("F — write failure maps to write-failed", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    spooler.failPrinter(
      "POS-80C",
      new WindowsSpoolerDeviceClientError("WritePrinter failed: access denied")
    );

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler, retryPolicy: { maxAttempts: 1, delayMs: 0 } })
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("write-failed");
  });

  it("G — timeout handling maps to timeout", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    spooler.failPrinter(
      "POS-80C",
      new WindowsSpoolerDeviceClientError("Windows spooler write timed out after 5000ms")
    );

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler, retryPolicy: { maxAttempts: 1, delayMs: 0 } })
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("timeout");
  });

  it("H — UsbTransportAdapter routes device-path vs windows-spooler endpoints", async () => {
    const usbClient = new MemoryUsbDeviceClient();
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    const adapter = createUsbTransportAdapter(usbClient, spooler);

    await adapter.deliver(
      buildTransportRequest({
        usbEndpoint: { kind: "device-path", devicePath: "\\\\.\\COM7" },
      })
    );
    await adapter.deliver(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      })
    );

    expect(usbClient.writer.writes[0]?.devicePath).toBe("\\\\.\\COM7");
    expect(spooler.writes[0]?.printerName).toBe("POS-80C");
  });

  it("I — retry behavior preserved for spooler delivery", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    let attempts = 0;
    const originalWrite = spooler.write.bind(spooler);
    spooler.write = async (options) => {
      attempts += 1;
      if (attempts < 2) {
        throw new WindowsSpoolerDeviceClientError("Spooler unavailable: transient");
      }
      return originalWrite(options);
    };

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler, retryPolicy: { maxAttempts: 2, delayMs: 0 } })
    );

    expect(result.status).toBe("completed");
    expect(result.attempts).toBe(2);
  });

  it("J — outcome reporting preserved for spooler success", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    const executionResult = completedExecutionResult();
    const transportResult = await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler })
    );
    const outcome = classifyExecutionOutcome(
      resolveExecutionOutcome({ executionResult, transportResult })
    );

    expect(outcome.status).toBe("executed");
    expect(outcome.category).toBe("execution-success");
  });

  it("K — transport registry compatibility", () => {
    const registry = createAgentTransportRegistry(createMemoryClients());
    expect(registry.listSupported()).toEqual(["network", "usb", "bluetooth"]);
    expect(registry.get("usb")?.transport).toBe("usb");
  });

  it("L — executor remains transport-agnostic", () => {
    const source = createRawEscPosExecutor.toString();
    expect(source).not.toMatch(/spooler|WritePrinter|OpenPrinter|POS-80C|USB001/i);
  });

  it("M — no architecture bypass through transport adapter only", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    const executionResult = completedExecutionResult();

    expect(executionResult.artifact?.byteLength).toBeGreaterThan(0);
    expect(spooler.writes).toHaveLength(0);

    await executeAgentTransportDelivery(
      buildTransportRequest({
        usbEndpoint: {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      }),
      createMemoryClients({ spooler })
    );

    expect(spooler.writes).toHaveLength(1);
  });

  it("N — POS-80C / USB001 validation scenario", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    const client = new MemoryAgentJobClient();
    client.seed({
      jobId: 100,
      restaurantId: 7,
      printerId: 10,
      orderId: 500,
      ticket: {
        orderId: 500,
        restaurantId: 7,
        items: [{ itemName: "Burger", quantity: 1 }],
      },
      executionPlan: {
        platform: "windows",
        contextBuilt: true,
        strategyResolved: true,
        method: "raw-escpos",
      },
      transportDeliveryContext: transportContext,
    });

    const sent: string[] = [];
    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: (data) => sent.push(data) },
      transportClients: createMemoryClients({ spooler }),
      usbTransportEndpoints: {
        "pos-80c-printer": {
          kind: "windows-spooler",
          printerName: "POS-80C",
          portName: "USB001",
        },
      },
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    const result = await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      protocolVersion: "1.0",
    });

    expect(result.transportResult?.status).toBe("completed");
    expect(result.executionOutcome?.status).toBe("executed");
    expect(spooler.writes[0]).toMatchObject({
      printerName: "POS-80C",
      portName: "USB001",
    });
    expect(JSON.parse(sent[0]!).type).toBe(
      AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT
    );
  });

  it("O — deterministic repeated spooler execution", async () => {
    const spooler = new MemoryWindowsSpoolerDeviceClient();
    spooler.registerPrinterPort("POS-80C", "USB001");
    const clients = createMemoryClients({ spooler });
    const request = buildTransportRequest({
      usbEndpoint: {
        kind: "windows-spooler",
        printerName: "POS-80C",
        portName: "USB001",
      },
    });

    const first = await executeAgentTransportDelivery(request, clients);
    const second = await executeAgentTransportDelivery(request, clients);

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(first.bytesTransmitted).toBe(second.bytesTransmitted);
  });
});
