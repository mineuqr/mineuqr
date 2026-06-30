import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";
import { samplePayload } from "../../connector-gateway/__tests__/testFixtures";
import { pairAndConnectConnector } from "./sessionTestHarness";

describe("Connector command routing", () => {
  it("routes execute_print command over session transport", async () => {
    const network = composeConnectorNetwork();
    await pairAndConnectConnector(network, {
      restaurantId: 30,
      connectorId: "rlc-30",
    });

    const route = await network.gateway.gateway.routePrint({
      jobId: 99,
      restaurantId: 30,
      orderId: 500,
      correlationId: "corr-30",
      payload: samplePayload(30, 500),
      requestedAt: new Date().toISOString(),
    });

    expect(route.routed).toBe(true);
    expect(route.connectorInstanceId).toBe("rlc-30");
  });

  it("returns transport_unavailable when no session exists", async () => {
    const network = composeConnectorNetwork();

    const route = await network.gateway.gateway.routePrint({
      jobId: 1,
      restaurantId: 99,
      orderId: 1,
      correlationId: null,
      payload: samplePayload(99, 1),
      requestedAt: new Date().toISOString(),
    });

    expect(route.routed).toBe(false);
    expect(route.failureReason).toBe("connector_unregistered");
  });
});
