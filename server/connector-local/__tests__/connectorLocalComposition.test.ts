import { describe, expect, it } from "vitest";
import { composeConnectorLocal } from "../connectorLocalComposition";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { adaptConnectorPeerTransport } from "../infrastructure/adaptConnectorPeerTransport";
import { StaticGatewayTransportFactory } from "../infrastructure/StaticGatewayTransportFactory";
import { createInProcessTransportPair } from "../../connector-session/infrastructure/InProcessConnectorTransport";

describe("connectorLocalComposition", () => {
  it("composes runtime independently of business layers", () => {
    const transport = createInProcessTransportPair();
    const local = composeConnectorLocal({
      configProvider: { load: () => createTestLocalConnectorConfig() },
      transportFactory: new StaticGatewayTransportFactory(adaptConnectorPeerTransport(transport.connector)),
    });

    expect(local.bootstrap).toBeDefined();
    expect(local.diagnostics).toBeDefined();
    expect(local.platformAdapterHost.isAvailable()).toBe(true);
    expect(local.createHost).toBeTypeOf("function");
  });
});
