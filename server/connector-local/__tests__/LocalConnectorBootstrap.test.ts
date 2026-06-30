import { describe, expect, it } from "vitest";
import { samplePayload } from "../../connector-gateway/__tests__/testFixtures";
import { wireTestRlc } from "./testWiring";

describe("LocalConnectorBootstrap", () => {
  it("runs canonical bootstrap sequence to healthy session", async () => {
    const { local } = await wireTestRlc();
    const host = local.createHost();

    const result = await local.bootstrap.start(host);

    expect(host.getLifecycle()).toBe("healthy");
    expect(result.sessionClient.getState().sessionId).toBeTruthy();
    expect(local.diagnostics.snapshot(host).health.connectorStatus).toBe("online");

    await local.bootstrap.stop(result);
    expect(host.getLifecycle()).toBe("stopped");
  });

  it("registers connector in cloud gateway", async () => {
    const { network, local } = await wireTestRlc({ restaurantId: 7, connectorId: "rlc-7" });
    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const gatewaySession = await network.gateway.registry.getSession(7);
    expect(gatewaySession?.identity.connectorInstanceId).toBe("rlc-7");

    await local.bootstrap.stop(result);
  });
});

describe("Gateway integration", () => {
  it("accepts deferred command responses over RLC session", async () => {
    const { network, local } = await wireTestRlc();
    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const route = await network.gateway.gateway.routePrint({
      jobId: 1,
      restaurantId: 1,
      orderId: 10,
      correlationId: null,
      payload: samplePayload(1, 10),
      requestedAt: new Date().toISOString(),
    });

    expect(route.routed).toBe(true);

    await local.bootstrap.stop(result);
  });
});
