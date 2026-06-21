import { describe, expect, it } from "vitest";
import {
  EXECUTION_STATUSES,
  type ExecutionArtifact,
  type ExecutionExecutionResult,
  type ExecutionResult,
  type ExecutionStatus,
  isEscPosPayload,
} from "../../shared/printing/executionExecutor";
import { resolveExecutionOutcome } from "../../shared/printing/executionOutcome";
import { executeTransportDelivery, resolveTransportForDelivery } from "../../shared/printing/transports/executeTransportDelivery";
import { createTransportRegistry } from "../../shared/printing/transports/transportRegistry";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { createRawEscPosExecutor } from "./executors/rawEscPosExecutor";

const sampleContext = {
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
    agentId: "agent-alpha",
    platform: "windows" as const,
    protocolVersion: "1.0",
    connectedAt: "2026-06-18T10:00:00.000Z",
    platformConsistent: true,
  },
};

const networkProfile = {
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
};

function completedExecutionResult() {
  const executor = createRawEscPosExecutor();
  return executor.execute({
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
  overrides: Partial<TransportExecutionRequest> = {}
): TransportExecutionRequest {
  return {
    executionResult: completedExecutionResult(),
    executionPlan: {
      platform: "windows",
      contextBuilt: true,
      strategyResolved: true,
      method: "raw-escpos",
    },
    executionContext: sampleContext,
    printerProfile: networkProfile,
    networkEndpoint: { host: "192.168.1.50", port: 9100 },
    ...overrides,
  };
}

class RecordingNetworkAdapter implements ExecutionTransportAdapter {
  readonly transport = "network" as const;
  readonly deliveries: TransportExecutionRequest[] = [];

  async deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    this.deliveries.push(request);
    return {
      status: "completed",
      transport: "network",
      bytesTransmitted: request.executionResult.artifact?.byteLength,
    };
  }
}

class StubAdapter implements ExecutionTransportAdapter {
  constructor(
    readonly transport: ExecutionTransport,
    private readonly result: TransportExecutionResult
  ) {}

  async deliver(_request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    return this.result;
  }
}

describe("transportExecution THERMAL-PRINTING-10B", () => {
  it("A — ExecutionExecutionResult alias resolves to ExecutionResult", () => {
    const legacy: ExecutionExecutionResult = {
      status: "completed",
      method: "raw-escpos",
    };
    const current: ExecutionResult = legacy;
    expect(current.status).toBe("completed");
    expect(EXECUTION_STATUSES).toContain("completed" satisfies ExecutionStatus);
  });

  it("B — ExecutionArtifact union accepts EscPosPayload only for now", () => {
    const artifact: ExecutionArtifact = buildEscPosPayloadFromAgentTicket({
      ticket: {
        orderId: 500,
        restaurantId: 7,
        items: [{ itemName: "Burger", quantity: 1 }],
      },
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
    });
    expect(isEscPosPayload(artifact)).toBe(true);
  });

  it("C — transport registry lookup lists network and stubs usb/bluetooth", () => {
    const registry = createTransportRegistry([
      new RecordingNetworkAdapter(),
      new StubAdapter("usb", {
        status: "not-implemented",
        transport: "usb",
      }),
      new StubAdapter("bluetooth", {
        status: "not-implemented",
        transport: "bluetooth",
      }),
    ]);

    expect(registry.listSupported()).toEqual(["network", "usb", "bluetooth"]);
    expect(registry.get("network")?.transport).toBe("network");
    expect(registry.get("usb")).toBeDefined();
  });

  it("D — network transport selection uses printer profile transport", () => {
    expect(
      resolveTransportForDelivery({
        executionContext: sampleContext,
        printerProfile: networkProfile,
      })
    ).toBe("network");
  });

  it("E — network transport execution delivers artifact bytes", async () => {
    const adapter = new RecordingNetworkAdapter();
    const registry = createTransportRegistry([adapter]);
    const result = await executeTransportDelivery(buildTransportRequest(), registry);

    expect(result.status).toBe("completed");
    expect(result.bytesTransmitted).toBeGreaterThan(0);
    expect(adapter.deliveries).toHaveLength(1);
    expect(isEscPosPayload(adapter.deliveries[0]!.executionResult.artifact!)).toBe(true);
  });

  it("F — USB registration returns not-implemented", async () => {
    const registry = createTransportRegistry([
      new StubAdapter("usb", {
        status: "not-implemented",
        transport: "usb",
        message: "USB transport adapter not implemented",
      }),
    ]);

    const result = await executeTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...networkProfile, transport: "usb" },
      }),
      registry
    );

    expect(result.status).toBe("not-implemented");
    expect(result.transport).toBe("usb");
  });

  it("G — Bluetooth registration returns not-implemented", async () => {
    const registry = createTransportRegistry([
      new StubAdapter("bluetooth", {
        status: "not-implemented",
        transport: "bluetooth",
      }),
    ]);

    const result = await executeTransportDelivery(
      buildTransportRequest({
        printerProfile: { ...networkProfile, transport: "bluetooth" },
      }),
      registry
    );

    expect(result.status).toBe("not-implemented");
    expect(result.transport).toBe("bluetooth");
  });

  it("H — unsupported transport handling rejects incomplete execution results", async () => {
    const registry = createTransportRegistry([new RecordingNetworkAdapter()]);
    const result = await executeTransportDelivery(
      buildTransportRequest({
        executionResult: {
          status: "failed",
          method: "raw-escpos",
          message: "payload failed",
        },
      }),
      registry
    );

    expect(result.status).toBe("rejected");
  });

  it("I — ExecutionResult flows into transport pipeline without strategy re-evaluation", async () => {
    const adapter = new RecordingNetworkAdapter();
    const registry = createTransportRegistry([adapter]);
    const executionResult = completedExecutionResult();

    await executeTransportDelivery(
      buildTransportRequest({
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
        executionResult,
      }),
      registry
    );

    expect(adapter.deliveries[0]?.executionResult).toBe(executionResult);
  });

  it("J — execution outcome reporting stays separate from delivery confirmation", () => {
    const executed = resolveExecutionOutcome({
      executionResult: completedExecutionResult(),
      transportResult: {
        status: "completed",
        transport: "network",
        bytesTransmitted: 128,
      },
    });
    const transportNotImplemented = resolveExecutionOutcome({
      executionResult: completedExecutionResult(),
      transportResult: {
        status: "not-implemented",
        transport: "usb",
      },
    });

    expect(executed.status).toBe("executed");
    expect(transportNotImplemented.status).toBe("transport-not-implemented");
  });

  it("L — no context or strategy re-evaluation in transport pipeline", async () => {
    const registry = createTransportRegistry([new RecordingNetworkAdapter()]);
    const result = await executeTransportDelivery(
      buildTransportRequest({
        executionPlan: {
          platform: "windows",
          contextBuilt: false,
          strategyResolved: false,
          message: "frozen-plan",
        },
      }),
      registry
    );

    expect(result.status).toBe("rejected");
    expect(result.message).toBe("frozen-plan");
  });

  it("P — deterministic transport behavior for repeated deliveries", async () => {
    const adapter = new RecordingNetworkAdapter();
    const registry = createTransportRegistry([adapter]);
    const request = buildTransportRequest();

    const first = await executeTransportDelivery(request, registry);
    const second = await executeTransportDelivery(request, registry);

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(first.bytesTransmitted).toBe(second.bytesTransmitted);
  });
});
