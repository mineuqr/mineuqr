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
  MemoryTcpSocketClient,
  MemoryTcpSocketClientFactory,
  type TcpSocketClient,
  type TcpSocketClientFactory,
} from "./tcpSocketClient";
import { createAgentTransportRegistry } from "./transportRegistry";
import { createNetworkTransportAdapter } from "./networkTransportAdapter";
import { createUsbTransportAdapter } from "./usbTransportAdapter";
import { createBluetoothTransportAdapter } from "./bluetoothTransportAdapter";
import { MemoryUsbDeviceClient } from "./usbDeviceClient";
import { MemoryBluetoothDeviceClient } from "./bluetoothDeviceClient";

const transportContext = {
  executionContext: {
    platform: { identity: "windows" as const },
    capabilities: {
      supportedMethods: ["raw-escpos" as const],
      supportedTransports: ["network", "usb", "bluetooth"] as const,
      supportsEscPos: true,
      supportsLocalExecution: true,
    },
    availability: {
      availableTransports: ["network", "usb", "bluetooth"] as const,
      hasPlatformCapabilityReport: true,
      printerTransportAvailable: true,
    },
    printer: {
      printerId: "kitchen-printer",
      printerName: "Kitchen",
      transport: "network" as const,
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
    printerId: "kitchen-printer",
    printerName: "Kitchen",
    transport: "network" as const,
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
    networkEndpoint: { host: "192.168.1.50", port: 9100 },
    ...overrides,
  };
}

class FailingTcpSocketClientFactory implements TcpSocketClientFactory {
  readonly clients: MemoryTcpSocketClient[] = [];
  private readonly failMessage: string;

  constructor(failMessage = "Connection failed") {
    this.failMessage = failMessage;
  }

  create(): TcpSocketClient {
    const client = new MemoryTcpSocketClient();
    client.failOnConnect(this.failMessage);
    this.clients.push(client);
    return client;
  }
}

class RetryThenSucceedTcpSocketClientFactory implements TcpSocketClientFactory {
  readonly clients: MemoryTcpSocketClient[] = [];
  private attempts = 0;
  private readonly failUntilAttempt: number;

  constructor(failUntilAttempt: number) {
    this.failUntilAttempt = failUntilAttempt;
  }

  create(): TcpSocketClient {
    const client = new MemoryTcpSocketClient();
    this.attempts += 1;
    if (this.attempts < this.failUntilAttempt) {
      client.failOnConnect("Connection failed");
    }
    this.clients.push(client);
    return client;
  }
}

describe("physicalDeviceExecution THERMAL-PRINTING-10C", () => {
  it("A — network printer delivery transmits ESC/POS bytes over TCP", async () => {
    const factory = new MemoryTcpSocketClientFactory();
    const result = await executeAgentTransportDelivery(buildTransportRequest(), {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
    });

    expect(result.status).toBe("completed");
    expect(result.bytesTransmitted).toBeGreaterThan(0);
    expect(factory.clients).toHaveLength(1);
    expect(factory.clients[0]!.connections).toEqual([
      { host: "192.168.1.50", port: 9100, timeoutMs: 5_000 },
    ]);
    expect(factory.clients[0]!.writes[0]?.byteLength).toBeGreaterThan(0);
  });

  it("B — network timeout handling reports timeout failure", async () => {
    const factory = new FailingTcpSocketClientFactory(
      "TCP connection timed out after 5000ms"
    );
    const result = await executeAgentTransportDelivery(
      buildTransportRequest(),
      {
        tcpSocketFactory: factory,
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
      }
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("timeout");
    expect(result.message).toContain("timed out");
  });

  it("C — network failure reporting classifies printer unreachable", async () => {
    const factory = new FailingTcpSocketClientFactory("ECONNREFUSED");
    const result = await executeAgentTransportDelivery(
      buildTransportRequest(),
      {
        tcpSocketFactory: factory,
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
      }
    );

    const outcome = classifyExecutionOutcome(
      resolveExecutionOutcome({
        executionResult: completedExecutionResult(),
        transportResult: result,
      })
    );

    expect(result.status).toBe("failed");
    expect(outcome.category).toBe("printer-unreachable");
  });

  it("D — USB transport execution writes bytes to device path", async () => {
    const usbClient = new MemoryUsbDeviceClient();
    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...transportContext.printerProfile, transport: "usb" },
        networkEndpoint: undefined,
        usbEndpoint: { devicePath: "\\\\.\\COM3" },
      }),
      {
        tcpSocketFactory: new MemoryTcpSocketClientFactory(),
        usbDeviceClient: usbClient,
        bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      }
    );

    expect(result.status).toBe("completed");
    expect(usbClient.writer.writes).toEqual([
      expect.objectContaining({
        devicePath: "\\\\.\\COM3",
        bytes: expect.any(Uint8Array),
      }),
    ]);
  });

  it("E — USB failure reporting when endpoint is missing", async () => {
    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...transportContext.printerProfile, transport: "usb" },
        networkEndpoint: undefined,
        usbEndpoint: undefined,
      }),
      {
        tcpSocketFactory: new MemoryTcpSocketClientFactory(),
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      }
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("endpoint-missing");
    expect(result.transport).toBe("usb");
  });

  it("F — Bluetooth transport execution writes bytes to device path", async () => {
    const bluetoothClient = new MemoryBluetoothDeviceClient();
    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...transportContext.printerProfile, transport: "bluetooth" },
        networkEndpoint: undefined,
        bluetoothEndpoint: { devicePath: "\\\\.\\COM5" },
      }),
      {
        tcpSocketFactory: new MemoryTcpSocketClientFactory(),
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: bluetoothClient,
      }
    );

    expect(result.status).toBe("completed");
    expect(bluetoothClient.writer.writes[0]?.devicePath).toBe("\\\\.\\COM5");
  });

  it("G — Bluetooth failure reporting when device write fails", async () => {
    const bluetoothClient = new MemoryBluetoothDeviceClient();
    bluetoothClient.writer.failPath("\\\\.\\COM5", new Error("Bluetooth write failed"));

    const result = await executeAgentTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...transportContext.printerProfile, transport: "bluetooth" },
        networkEndpoint: undefined,
        bluetoothEndpoint: { devicePath: "\\\\.\\COM5" },
      }),
      {
        tcpSocketFactory: new MemoryTcpSocketClientFactory(),
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: bluetoothClient,
        retryPolicy: { maxAttempts: 1, delayMs: 0 },
      }
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("write-failed");
  });

  it("H — execution outcome reporting reflects transport execution", async () => {
    const factory = new MemoryTcpSocketClientFactory();
    const executionResult = completedExecutionResult();
    const transportResult = await executeAgentTransportDelivery(buildTransportRequest(), {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
    });

    const outcome = resolveExecutionOutcome({ executionResult, transportResult });
    expect(outcome.status).toBe("executed");
    expect(classifyExecutionOutcome(outcome).category).toBe("execution-success");
  });

  it("I — retry behavior retries failed network connections", async () => {
    const factory = new RetryThenSucceedTcpSocketClientFactory(3);
    const result = await executeAgentTransportDelivery(buildTransportRequest(), {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      retryPolicy: { maxAttempts: 3, delayMs: 0 },
    });

    expect(result.status).toBe("completed");
    expect(result.attempts).toBe(3);
    expect(factory.clients).toHaveLength(3);
  });

  it("J — retry exhaustion reports retry-exhausted failure", async () => {
    const factory = new FailingTcpSocketClientFactory();
    const result = await executeAgentTransportDelivery(buildTransportRequest(), {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      retryPolicy: { maxAttempts: 2, delayMs: 0 },
    });

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("retry-exhausted");
    expect(result.attempts).toBe(2);
    expect(factory.clients).toHaveLength(2);

    const outcome = resolveExecutionOutcome({
      executionResult: completedExecutionResult(),
      transportResult: result,
    });
    expect(classifyExecutionOutcome(outcome).category).toBe("retry-exhausted");
  });

  it("K — agent reports execution outcome to server during job consumption", async () => {
    const factory = new MemoryTcpSocketClientFactory();
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
      transportClients: {
        tcpSocketFactory: factory,
        usbDeviceClient: new MemoryUsbDeviceClient(),
        bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      },
      networkTransportEndpoints: {
        "kitchen-printer": { host: "192.168.1.50", port: 9100 },
      },
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    const result = await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      protocolVersion: "1.0",
    });

    expect(result.outcomeReported).toBe(true);
    expect(JSON.parse(sent[0]!).type).toBe(
      AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT
    );
    expect(JSON.parse(sent[0]!).category).toBe("execution-success");
  });

  it("L — transport boundary preserved via registry adapters only", () => {
    const factory = new MemoryTcpSocketClientFactory();
    const registry = createAgentTransportRegistry({
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
    });

    expect(registry.listSupported()).toEqual(["network", "usb", "bluetooth"]);
    expect(createNetworkTransportAdapter(factory).transport).toBe("network");
    expect(createUsbTransportAdapter(new MemoryUsbDeviceClient()).transport).toBe("usb");
    expect(
      createBluetoothTransportAdapter(new MemoryBluetoothDeviceClient()).transport
    ).toBe("bluetooth");
  });

  it("M — no executor device access", () => {
    const source = createRawEscPosExecutor.toString();
    expect(source).not.toMatch(/tcp|socket|usb|bluetooth|net\.|devicePath/i);
  });

  it("N — deterministic execution for repeated deliveries", async () => {
    const factory = new MemoryTcpSocketClientFactory();
    const clients = {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
    };
    const request = buildTransportRequest();

    const first = await executeAgentTransportDelivery(request, clients);
    const second = await executeAgentTransportDelivery(request, clients);

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(first.bytesTransmitted).toBe(second.bytesTransmitted);
  });

  it("O — real transport integration creates isolated socket clients per attempt", async () => {
    const factory = new RetryThenSucceedTcpSocketClientFactory(2);
    const result = await executeAgentTransportDelivery(buildTransportRequest(), {
      tcpSocketFactory: factory,
      usbDeviceClient: new MemoryUsbDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      retryPolicy: { maxAttempts: 2, delayMs: 0 },
    });

    expect(result.status).toBe("completed");
    expect(factory.clients).toHaveLength(2);
    expect(factory.clients[0]).not.toBe(factory.clients[1]);
  });
});
