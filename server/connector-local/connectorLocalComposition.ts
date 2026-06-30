import { ConnectorReconnectPolicy } from "../connector-session/services/ConnectorReconnectPolicy";
import type { PrintConnectorApi } from "../print-connector/contracts/PrintConnectorApi";
import type { ConnectorCommandHandler } from "./contracts/ConnectorCommandHandler";
import type { GatewayTransportFactory } from "./contracts/GatewayTransportPort";
import type { LocalConnectorConfigProvider } from "./contracts/LocalConnectorConfig";
import { DeferredConnectorCommandHandler } from "./infrastructure/DeferredConnectorCommandHandler";
import { EnvLocalConnectorConfigProvider } from "./infrastructure/EnvLocalConnectorConfigProvider";
import { RuntimeConnectorCommandHandler } from "./infrastructure/RuntimeConnectorCommandHandler";
import { LocalConnectorBootstrap } from "./services/LocalConnectorBootstrap";
import { LocalConnectorDiagnostics } from "./services/LocalConnectorDiagnostics";
import { LocalConnectorHost } from "./services/LocalConnectorHost";
import { PlatformAdapterHost } from "./services/PlatformAdapterHost";
import { buildRuntimeIdentity } from "./services/RuntimeIdentityBuilder";
import {
  createRlcWindowsConnectorRuntime,
  isRlcWindowsHost,
} from "./windows/createRlcWindowsConnectorRuntime";
import { WindowsRuntimeDiagnostics } from "./windows/WindowsRuntimeDiagnostics";

export type ConnectorLocalComposition = {
  configProvider: LocalConnectorConfigProvider;
  commandHandler: ConnectorCommandHandler;
  platformAdapterHost: PlatformAdapterHost;
  connectorRuntime: PrintConnectorApi | null;
  windowsDiagnostics: WindowsRuntimeDiagnostics | null;
  reconnectPolicy: ConnectorReconnectPolicy;
  bootstrap: LocalConnectorBootstrap;
  diagnostics: LocalConnectorDiagnostics;
  createHost(): LocalConnectorHost;
};

export type ComposeConnectorLocalOptions = {
  configProvider?: LocalConnectorConfigProvider;
  transportFactory: GatewayTransportFactory;
  commandHandler?: ConnectorCommandHandler;
  connectorRuntime?: PrintConnectorApi | null;
  reconnectPolicy?: ConnectorReconnectPolicy;
};

function resolveConnectorRuntime(
  configProvider: LocalConnectorConfigProvider,
  override?: PrintConnectorApi | null
): PrintConnectorApi | null {
  if (override !== undefined) return override;
  if (!isRlcWindowsHost()) return null;
  const config = configProvider.load();
  const identity = buildRuntimeIdentity(config);
  return createRlcWindowsConnectorRuntime(identity);
}

function resolveCommandHandler(
  configProvider: LocalConnectorConfigProvider,
  runtime: PrintConnectorApi | null,
  override?: ConnectorCommandHandler
): ConnectorCommandHandler {
  if (override) return override;
  if (runtime) {
    return new RuntimeConnectorCommandHandler(runtime, configProvider);
  }
  return new DeferredConnectorCommandHandler();
}

export function composeConnectorLocal(
  options: ComposeConnectorLocalOptions
): ConnectorLocalComposition {
  const configProvider = options.configProvider ?? new EnvLocalConnectorConfigProvider();
  const reconnectPolicy = options.reconnectPolicy ?? new ConnectorReconnectPolicy();
  const platformAdapterHost = new PlatformAdapterHost();
  platformAdapterHost.initialize();

  const connectorRuntime = resolveConnectorRuntime(configProvider, options.connectorRuntime);
  const commandHandler = resolveCommandHandler(
    configProvider,
    connectorRuntime,
    options.commandHandler
  );

  const windowsDiagnostics =
    connectorRuntime && platformAdapterHost.getAdapter()
      ? new WindowsRuntimeDiagnostics(connectorRuntime, platformAdapterHost.getAdapter()!)
      : null;

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
    connectorRuntime,
    windowsDiagnostics,
    reconnectPolicy,
    bootstrap,
    diagnostics: new LocalConnectorDiagnostics(),
    createHost: () => bootstrap.createHost(),
  };
}
