import { describe, expect, it } from "vitest";
import { InMemoryConnectorRegistryRepository } from "../infrastructure/InMemoryConnectorRegistryRepository";
import { ConnectorDirectory } from "../services/ConnectorDirectory";
import { ConnectorGatewayService } from "../services/ConnectorGatewayService";
import { ConnectorHealthService } from "../services/ConnectorHealthService";
import { ConnectorRegistry } from "../services/ConnectorRegistry";
import { ConnectorResolver } from "../services/ConnectorResolver";
import { samplePayload, sampleRegistration } from "./testFixtures";
import { stubConnectorExecutionPort } from "./stubConnectorExecutionPort";
import type { ConnectorExecutionPort } from "../contracts/ConnectorExecutionPort";

function buildGateway(execution: ConnectorExecutionPort) {
  const repository = new InMemoryConnectorRegistryRepository();
  const registry = new ConnectorRegistry(repository);
  const health = new ConnectorHealthService(repository, () => Date.parse("2026-06-26T12:00:10.000Z"));
  const resolver = new ConnectorResolver(registry, health);
  const directory = new ConnectorDirectory(repository, health);
  const gateway = new ConnectorGatewayService(registry, resolver, health, directory, execution);
  return { gateway, directory, registry };
}

describe("ConnectorGatewayService", () => {
  it("routes print to registered connector when transport succeeds", async () => {
    const execution = stubConnectorExecutionPort();
    const { gateway, registry } = buildGateway(execution);

    await registry.register(sampleRegistration());

    const result = await gateway.routePrint({
      jobId: 10,
      restaurantId: 1,
      orderId: 100,
      correlationId: "corr-1",
      payload: samplePayload(),
      requestedAt: "2026-06-26T12:00:00.000Z",
    });

    expect(result.routed).toBe(true);
    expect(result.connectorInstanceId).toBe("rlc-instance-1");
  });

  it("fails when connector is unregistered", async () => {
    const execution = stubConnectorExecutionPort();
    const { gateway } = buildGateway(execution);

    const result = await gateway.routePrint({
      jobId: 10,
      restaurantId: 1,
      orderId: 100,
      correlationId: null,
      payload: samplePayload(),
      requestedAt: "2026-06-26T12:00:00.000Z",
    });

    expect(result.routed).toBe(false);
    expect(result.failureReason).toBe("connector_unregistered");
  });

  it("fails when transport is unavailable", async () => {
    const execution = stubConnectorExecutionPort({
      executePrint: async () => ({
        success: false,
        failureReason: "transport_unavailable",
        message: "No session",
      }),
    });
    const { gateway, registry } = buildGateway(execution);

    await registry.register(sampleRegistration());

    const result = await gateway.routePrint({
      jobId: 10,
      restaurantId: 1,
      orderId: 100,
      correlationId: null,
      payload: samplePayload(),
      requestedAt: "2026-06-26T12:00:00.000Z",
    });

    expect(result.routed).toBe(false);
    expect(result.failureReason).toBe("transport_unavailable");
  });
});

describe("ConnectorDirectory", () => {
  it("lists sessions and returns health snapshots", async () => {
    const execution = stubConnectorExecutionPort();
    const { gateway, directory, registry } = buildGateway(execution);

    await registry.register(sampleRegistration());

    const sessions = await directory.listSessions();
    expect(sessions).toHaveLength(1);

    const health = await gateway.getDirectory().getHealthForRestaurant(1);
    expect(health?.status.isRegistered).toBe(true);
  });
});
