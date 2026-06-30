import { describe, expect, it } from "vitest";
import { InMemoryConnectorRegistryRepository } from "../infrastructure/InMemoryConnectorRegistryRepository";
import { ConnectorRegistry } from "../services/ConnectorRegistry";
import { sampleRegistration } from "./testFixtures";

describe("ConnectorRegistry", () => {
  it("registers a connector session for a restaurant", async () => {
    const registry = new ConnectorRegistry(new InMemoryConnectorRegistryRepository());
    const command = sampleRegistration();

    const result = await registry.register(command);

    expect(result.identity.restaurantId).toBe(1);
    expect(result.identity.connectorInstanceId).toBe("rlc-instance-1");
    expect(result.session.status.isRegistered).toBe(true);
    expect(result.session.runtime.endpoint.hostLabel).toBe("kitchen-pc");
  });

  it("retrieves session by restaurant and instance", async () => {
    const registry = new ConnectorRegistry(new InMemoryConnectorRegistryRepository());
    const command = sampleRegistration();

    await registry.register(command);

    expect(await registry.getSession(1)).not.toBeNull();
    expect(await registry.getSessionByInstance("rlc-instance-1")).not.toBeNull();
    expect(await registry.getSession(99)).toBeNull();
  });

  it("unregisters a connector", async () => {
    const registry = new ConnectorRegistry(new InMemoryConnectorRegistryRepository());
    const command = sampleRegistration();

    await registry.register(command);
    expect(await registry.unregister(1, "rlc-instance-1")).toBe(true);
    expect(await registry.getSession(1)).toBeNull();
    expect(await registry.unregister(1, "rlc-instance-1")).toBe(false);
  });
});
