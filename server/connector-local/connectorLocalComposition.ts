import { ConnectorReconnectPolicy } from "../connector-session/services/ConnectorReconnectPolicy";
import type { ConnectorCommandHandler } from "./contracts/ConnectorCommandHandler";
import type { GatewayTransportFactory } from "./contracts/GatewayTransportPort";
import type { LocalConnectorConfigProvider } from "./contracts/LocalConnectorConfig";
import { DeferredConnectorCommandHandler } from "./infrastructure/DeferredConnectorCommandHandler";
import { EnvLocalConnectorConfigProvider } from "./infrastructure/EnvLocalConnectorConfigProvider";
import { LocalConnectorBootstrap } from "./services/LocalConnectorBootstrap";
import { LocalConnectorDiagnostics } from "./services/LocalConnectorDiagnostics";
import { LocalConnectorHost } from "./services/LocalConnectorHost";
import { PlatformAdapterHost } from "./services/PlatformAdapterHost";

export type ConnectorLocalComposition = {
  configProvider: LocalConnectorConfigProvider;
  commandHandler: ConnectorCommandHandler;
  platformAdapterHost: PlatformAdapterHost;
  reconnectPolicy: ConnectorReconnectPolicy;
  bootstrap: LocalConnectorBootstrap;
  diagnostics: LocalConnectorDiagnostics;
  createHost(): LocalConnectorHost;
};

export type ComposeConnectorLocalOptions = {
  configProvider?: LocalConnectorConfigProvider;
  transportFactory: GatewayTransportFactory;
  commandHandler?: ConnectorCommandHandler;
  reconnectPolicy?: ConnectorReconnectPolicy;
};

export function composeConnectorLocal(
  options: ComposeConnectorLocalOptions
): ConnectorLocalComposition {
  const configProvider = options.configProvider ?? new EnvLocalConnectorConfigProvider();
  const commandHandler = options.commandHandler ?? new DeferredConnectorCommandHandler();
  const reconnectPolicy = options.reconnectPolicy ?? new ConnectorReconnectPolicy();
  const platformAdapterHost = new PlatformAdapterHost();
  platformAdapterHost.initialize();

  const bootstrap = new LocalConnectorBootstrap(
    configProvider,
    options.transportFactory,
    commandHandler,
    reconnectPolicy
  );

  return {
    configProvider,
    commandHandler,
    platformAdapterHost,
    reconnectPolicy,
    bootstrap,
    diagnostics: new LocalConnectorDiagnostics(),
    createHost: () => bootstrap.createHost(),
  };
}
