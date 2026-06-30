import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";
import { pairAndConnectConnector } from "./sessionTestHarness";

describe("Connector session lifecycle", () => {
  it("progresses from connecting through registered to healthy", async () => {
    const network = composeConnectorNetwork();
    const connected = await pairAndConnectConnector(network, {
      restaurantId: 10,
      connectorId: "rlc-10",
    });

    const session = await network.session.sessionManager.getByConnectorId(connected.connectorId);
    expect(session?.lifecycle).toBe("healthy");
    expect(session?.identity.restaurantId).toBe(10);
  });

  it("registers connector in gateway directory", async () => {
    const network = composeConnectorNetwork();
    await pairAndConnectConnector(network, {
      restaurantId: 11,
      connectorId: "rlc-11",
    });

    const gatewaySession = await network.gateway.registry.getSession(11);
    expect(gatewaySession?.identity.connectorInstanceId).toBe("rlc-11");
  });
});
