import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";
import { createInProcessTransportPair } from "../infrastructure/InProcessConnectorTransport";
import { pairAndConnectConnector } from "./sessionTestHarness";

describe("duplicate session protection", () => {
  it("replaces existing session when same connector reconnects", async () => {
    const network = composeConnectorNetwork();
    await pairAndConnectConnector(network, {
      restaurantId: 40,
      connectorId: "rlc-dup",
    });

    const firstSession = await network.session.sessionManager.getByConnectorId("rlc-dup");
    expect(firstSession).not.toBeNull();

    await pairAndConnectConnector(network, {
      restaurantId: 40,
      connectorId: "rlc-dup",
    });

    const secondSession = await network.session.sessionManager.getByConnectorId("rlc-dup");
    expect(secondSession?.sessionId).not.toBe(firstSession?.sessionId);
    expect(secondSession?.lifecycle).toBe("healthy");
  });
});

describe("session disconnect cleanup", () => {
  it("cleans up transport binding on disconnect", async () => {
    const network = composeConnectorNetwork();
    const connected = await pairAndConnectConnector(network, {
      restaurantId: 41,
      connectorId: "rlc-disc",
    });

    const session = await network.session.sessionManager.getByConnectorId("rlc-disc");
    await network.session.sessionManager.disconnect(session!.sessionId);

    expect(await network.session.sessionManager.getByConnectorId("rlc-disc")).toBeNull();
    expect(network.session.transportRegistry.getByInstance("rlc-disc")).toBeNull();
  });

  it("handles transport disconnect event", async () => {
    const network = composeConnectorNetwork();
    const transport = createInProcessTransportPair();
    network.session.acceptConnection(transport.cloud);

    await transport.connector.sendInbound({
      type: "auth",
      payload: {
        restaurantId: 1,
        connectorId: "x",
        runtimeId: "r",
        credentialSecret: "bad",
        version: "1.0.0",
        platform: "windows",
      },
    });

    await transport.cloud.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const session = await network.session.sessionManager.getByConnection(transport.cloud.connectionId);
    expect(session).toBeNull();
  });
});
