import { describe, expect, it } from "vitest";
import { InMemoryConnectorRegistryRepository } from "../infrastructure/InMemoryConnectorRegistryRepository";
import { ConnectorHealthService } from "../services/ConnectorHealthService";
import { ConnectorRegistry } from "../services/ConnectorRegistry";
import { ConnectorResolver } from "../services/ConnectorResolver";
import { sampleRegistration } from "./testFixtures";

describe("ConnectorResolver", () => {
  it("returns unregistered when no connector exists", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const health = new ConnectorHealthService(repository);
    const resolver = new ConnectorResolver(registry, health);

    const result = await resolver.resolve(1);

    expect(result.session).toBeNull();
    expect(result.reason).toBe("unregistered");
  });

  it("returns found for healthy connector", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const health = new ConnectorHealthService(repository, () => Date.parse("2026-06-26T12:00:10.000Z"));
    const resolver = new ConnectorResolver(registry, health);

    await registry.register(
      sampleRegistration({
        restaurantId: 1,
        connectorInstanceId: "rlc-1",
      })
    );

    const result = await resolver.resolve(1);

    expect(result.session?.identity.connectorInstanceId).toBe("rlc-1");
    expect(result.reason).toBe("found");
  });

  it("returns offline when heartbeat is stale", async () => {
    const repository = new InMemoryConnectorRegistryRepository();
    const registry = new ConnectorRegistry(repository);
    const heartbeatAt = "2026-06-26T12:00:00.000Z";
    const evaluatedAt = Date.parse(heartbeatAt) + 120_000;
    const health = new ConnectorHealthService(repository, () => evaluatedAt);
    const resolver = new ConnectorResolver(registry, health);

    await registry.register(sampleRegistration());
    await health.recordHeartbeat({
      restaurantId: 1,
      connectorInstanceId: "rlc-instance-1",
      receivedAt: heartbeatAt,
    });

    const result = await resolver.resolve(1);

    expect(result.session).not.toBeNull();
    expect(result.reason).toBe("offline");
  });
});
