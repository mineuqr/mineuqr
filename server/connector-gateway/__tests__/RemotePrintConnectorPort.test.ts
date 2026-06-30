import { describe, expect, it, vi } from "vitest";
import { stubConnectorExecutionPort } from "./stubConnectorExecutionPort";
import { RemotePrintConnectorPort } from "../adapters/RemotePrintConnectorPort";
import { composeConnectorGateway } from "../gatewayComposition";
import { InMemoryConnectorRegistryRepository } from "../infrastructure/InMemoryConnectorRegistryRepository";
import { samplePayload, sampleRegistration } from "./testFixtures";

describe("RemotePrintConnectorPort", () => {
  it("reports success when gateway routes print", async () => {
    const execution = stubConnectorExecutionPort({
      executePrint: async () => ({
        success: true,
        execution: {
          executionId: "exec-42",
          printJobId: 42,
          restaurantId: 1,
          printerId: "win:kitchen",
          success: true,
          completedAt: new Date().toISOString(),
        },
      }),
    });
    const composition = composeConnectorGateway({ execution });
    await composition.registry.register(sampleRegistration());

    const reportPrintSuccess = vi.fn().mockResolvedValue(undefined);
    const reportPrintFailure = vi.fn().mockResolvedValue(undefined);
    const port = composition.createRemotePrintConnectorPort({
      reportPrintingStarted: vi.fn(),
      reportPrintSuccess,
      reportPrintFailure,
    });

    const result = await port.submit({
      jobId: 42,
      restaurantId: 1,
      orderId: 100,
      correlationId: "c-1",
      payload: samplePayload(),
    });

    expect(reportPrintSuccess).toHaveBeenCalledWith({ jobId: 42, restaurantId: 1 });
    expect(reportPrintFailure).not.toHaveBeenCalled();
    expect(result).toEqual({ executionId: "exec-42" });
  });

  it("routes cancel through gateway", async () => {
    const executeCancelPrint = vi.fn(async () => ({ success: true }));
    const composition = composeConnectorGateway({
      execution: stubConnectorExecutionPort({ executeCancelPrint }),
    });
    await composition.registry.register(sampleRegistration());

    const port = composition.createRemotePrintConnectorPort({
      reportPrintingStarted: vi.fn(),
      reportPrintSuccess: vi.fn(),
      reportPrintFailure: vi.fn(),
    });

    await port.cancel({
      jobId: 42,
      restaurantId: 1,
      executionId: "exec-42",
    });

    expect(executeCancelPrint).toHaveBeenCalled();
  });

  it("reports failure when connector is unregistered", async () => {
    const composition = composeConnectorGateway();
    const reportPrintFailure = vi.fn().mockResolvedValue(undefined);
    const port = composition.createRemotePrintConnectorPort({
      reportPrintingStarted: vi.fn(),
      reportPrintSuccess: vi.fn(),
      reportPrintFailure,
    });

    await port.submit({
      jobId: 42,
      restaurantId: 1,
      orderId: 100,
      correlationId: null,
      payload: samplePayload(),
    });

    expect(reportPrintFailure).toHaveBeenCalled();
  });
});

describe("gatewayComposition", () => {
  it("composes gateway services independently", () => {
    const composition = composeConnectorGateway({
      repository: new InMemoryConnectorRegistryRepository(),
    });

    expect(composition.gateway).toBeDefined();
    expect(composition.registry).toBeDefined();
    expect(composition.resolver).toBeDefined();
    expect(composition.health).toBeDefined();
    expect(composition.directory).toBeDefined();
  });
});
