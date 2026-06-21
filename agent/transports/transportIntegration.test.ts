import { describe, expect, it } from "vitest";
import { createRawEscPosExecutor } from "../execution/executors/rawEscPosExecutor";
import { executeAgentTransportDelivery } from "../execution/executeTransportDelivery";
import { JobConsumptionService } from "../consumption/jobConsumptionService";
import { MemoryAgentJobClient } from "../jobs/jobClient";
import { MemoryTcpSocketClient } from "../transports/tcpSocketClient";
import { createAgentTransportRegistry } from "../transports/transportRegistry";
import { createBluetoothTransportAdapter } from "../transports/bluetoothTransportAdapter";
import { createUsbTransportAdapter } from "../transports/usbTransportAdapter";
import { createNetworkTransportAdapter } from "../transports/networkTransportAdapter";

const transportContext = {
  executionContext: {
    platform: { identity: "windows" as const },
    capabilities: {
      supportedMethods: ["raw-escpos" as const],
      supportedTransports: ["network" as const],
      supportsEscPos: true,
      supportsLocalExecution: true,
    },
    availability: {
      availableTransports: ["network" as const],
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

describe("agent transport integration THERMAL-PRINTING-10B", () => {
  it("K — agent runtime executes transport flow after executor completion", async () => {
    const socket = new MemoryTcpSocketClient();
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

    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: () => {} },
      tcpSocketClient: socket,
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

    expect(result.executionResult?.status).toBe("completed");
    expect(result.transportResult?.status).toBe("completed");
    expect(result.executionOutcome?.status).toBe("executed");
    expect(socket.connections).toEqual([
      { host: "192.168.1.50", port: 9100, timeoutMs: 5_000 },
    ]);
    expect(socket.writes[0]?.byteLength).toBeGreaterThan(0);
  });

  it("N — executor remains transport-agnostic", () => {
    const source = createRawEscPosExecutor.toString();
    expect(source).not.toMatch(/tcp|socket|usb|bluetooth|net\./i);
  });

  it("O — no direct socket access from raw-escpos executor module", async () => {
    const socket = new MemoryTcpSocketClient();
    const executor = createRawEscPosExecutor();
    const executionResult = executor.execute({
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

    expect(socket.connections).toHaveLength(0);
    expect(executionResult.artifact?.byteLength).toBeGreaterThan(0);

    const transportResult = await executeAgentTransportDelivery(
      {
        executionResult,
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        executionContext: transportContext.executionContext,
        printerProfile: transportContext.printerProfile,
        networkEndpoint: { host: "10.0.0.10", port: 9100 },
      },
      socket
    );

    expect(transportResult.status).toBe("completed");
    expect(socket.writes).toHaveLength(1);
  });

  it("registers usb and bluetooth adapters as not-implemented", async () => {
    const socket = new MemoryTcpSocketClient();
    const registry = createAgentTransportRegistry(socket);

    expect(registry.listSupported()).toEqual(["network", "usb", "bluetooth"]);
    expect(
      await createUsbTransportAdapter().deliver({
        executionResult: { status: "completed", method: "raw-escpos" },
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        executionContext: transportContext.executionContext,
        printerProfile: { ...transportContext.printerProfile, transport: "usb" },
      })
    ).toMatchObject({ status: "not-implemented", transport: "usb" });
    expect(
      await createBluetoothTransportAdapter().deliver({
        executionResult: { status: "completed", method: "raw-escpos" },
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        executionContext: transportContext.executionContext,
        printerProfile: { ...transportContext.printerProfile, transport: "bluetooth" },
      })
    ).toMatchObject({ status: "not-implemented", transport: "bluetooth" });
    expect(createNetworkTransportAdapter(socket).transport).toBe("network");
  });
});
