import type { ConnectorNetworkComposition } from "../../connector-session/networkComposition";
import { composeConnectorNetwork } from "../../connector-session/networkComposition";
import { createInProcessTransportPair } from "../../connector-session/infrastructure/InProcessConnectorTransport";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { DeferredConnectorCommandHandler } from "../infrastructure/DeferredConnectorCommandHandler";
import { RuntimeConnectorCommandHandler } from "../infrastructure/RuntimeConnectorCommandHandler";
import { adaptConnectorPeerTransport } from "../infrastructure/adaptConnectorPeerTransport";
import { StaticGatewayTransportFactory } from "../infrastructure/StaticGatewayTransportFactory";
import { composeConnectorLocal } from "../connectorLocalComposition";

export type TestRlcWiring = {
  network: ConnectorNetworkComposition;
  local: ReturnType<typeof composeConnectorLocal>;
  credentialSecret: string;
};

export async function wireTestRlc(input?: {
  restaurantId?: number;
  connectorId?: string;
  useRuntimeHandler?: boolean;
  connectorRuntime?: PrintConnectorApi;
}): Promise<TestRlcWiring> {
  const restaurantId = input?.restaurantId ?? 1;
  const connectorId = input?.connectorId ?? "rlc-local-test";

  const network = composeConnectorNetwork();
  const pairing = await network.session.authService.issuePairingToken(restaurantId);
  const credential = await network.session.authService.completePairing(pairing.token, connectorId);
  if (!credential) {
    throw new Error("pairing_failed");
  }

  const transport = createInProcessTransportPair();
  network.session.acceptConnection(transport.cloud);

  const configProvider = {
    load: () =>
      createTestLocalConnectorConfig({
        restaurantId,
        connectorId,
        credentialSecret: credential.secret,
        heartbeatIntervalMs: 500,
      }),
  };

  const local = composeConnectorLocal({
    configProvider,
    transportFactory: new StaticGatewayTransportFactory(adaptConnectorPeerTransport(transport.connector)),
    connectorRuntime: input?.connectorRuntime ?? (input?.useRuntimeHandler ? undefined : null),
    commandHandler:
      input?.connectorRuntime != null
        ? new RuntimeConnectorCommandHandler(input.connectorRuntime, configProvider)
        : input?.useRuntimeHandler
          ? undefined
          : new DeferredConnectorCommandHandler(),
  });

  return { network, local, credentialSecret: credential.secret };
}
