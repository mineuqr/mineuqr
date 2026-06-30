import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";
import { pairAndConnectConnector, sendHeartbeat } from "./sessionTestHarness";

describe("ConnectorHeartbeatProtocol", () => {
  it("records heartbeat in gateway and keeps session healthy", async () => {
    const network = composeConnectorNetwork();
    const connected = await pairAndConnectConnector(network, {
      restaurantId: 20,
      connectorId: "rlc-20",
    });

    const result = await sendHeartbeat(connected);
    expect(result.success).toBe(true);
    expect(result.lifecycle).toBe("healthy");

    const health = await network.gateway.directory.getHealthForRestaurant(20);
    expect(health?.status.isHealthy).toBe(true);
  });
});
