import { describe, expect, it } from "vitest";
import { InMemoryConnectorRegistryRepository } from "../infrastructure/InMemoryConnectorRegistryRepository";
import { ConnectorHealthService } from "../services/ConnectorHealthService";
import { ConnectorRegistry } from "../services/ConnectorRegistry";
import { sampleRegistration } from "./testFixtures";

describe("ConnectorHealthService", () => {
  it("evaluates online when heartbeat is recent", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const now = Date.parse("2026-06-26T12:00:20.000Z");
    const health = new ConnectorHealthService(repository, () => now);

    const { session } = await registry.register(sampleRegistration());
    const evaluated = health.evaluate(session, now);

    expect(evaluated.status.availability).toBe("online");
    expect(evaluated.status.isHealthy).toBe(true);
  });

  it("evaluates degraded after threshold", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const heartbeatAt = "2026-06-26T12:00:00.000Z";
    const evaluatedAt = Date.parse(heartbeatAt) + 45_000;
    const health = new ConnectorHealthService(repository, () => evaluatedAt);

    await registry.register(sampleRegistration());
    await health.recordHeartbeat({
      restaurantId: 1,
      connectorInstanceId: "rlc-instance-1",
      receivedAt: heartbeatAt,
    });
    const session = await registry.getSession(1);
    const evaluated = health.evaluate(session!, evaluatedAt);

    expect(evaluated.status.availability).toBe("degraded");
    expect(evaluated.status.isHealthy).toBe(false);
  });

  it("records heartbeat and refreshes session", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const health = new ConnectorHealthService(repository);

    await registry.register(sampleRegistration());

    const updated = await health.recordHeartbeat({
      restaurantId: 1,
      connectorInstanceId: "rlc-instance-1",
      receivedAt: "2026-06-26T12:01:00.000Z",
    });

    expect(updated?.runtime.lastHeartbeatAt).toBe("2026-06-26T12:01:00.000Z");
    expect(updated?.status.availability).toBe("online");
  });

  it("rejects heartbeat for unknown connector", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const health = new ConnectorHealthService(repository);

    const updated = await health.recordHeartbeat({
      restaurantId: 1,
      connectorInstanceId: "missing",
      receivedAt: "2026-06-26T12:01:00.000Z",
    });

    expect(updated).toBeNull();
  });
});
