import { InMemoryConnectorRegistryRepository } from "./infrastructure/InMemoryConnectorRegistryRepository";
import { PendingConnectorExecutionPort } from "./infrastructure/PendingConnectorExecutionPort";
import { RemotePrintConnectorPort } from "./adapters/RemotePrintConnectorPort";
import { ConnectorDirectory } from "./services/ConnectorDirectory";
import { ConnectorGatewayService } from "./services/ConnectorGatewayService";
import { ConnectorHealthService } from "./services/ConnectorHealthService";
import { ConnectorRegistry } from "./services/ConnectorRegistry";
import { ConnectorResolver } from "./services/ConnectorResolver";
import type { ConnectorExecutionPort } from "./contracts/ConnectorExecutionPort";
import type { ConnectorRegistryRepository } from "./contracts/ConnectorRegistryRepository";
import type { PrintResultPort } from "../printing/contracts/ports/PrintResultPort";

export type ConnectorGatewayComposition = {
  repository: ConnectorRegistryRepository;
  registry: ConnectorRegistry;
  resolver: ConnectorResolver;
  health: ConnectorHealthService;
  directory: ConnectorDirectory;
  gateway: ConnectorGatewayService;
  createRemotePrintConnectorPort(printResultPort: PrintResultPort): RemotePrintConnectorPort;
};

export type ComposeConnectorGatewayOptions = {
  repository?: ConnectorRegistryRepository;
  execution?: ConnectorExecutionPort;
};

export function composeConnectorGateway(
  options: ComposeConnectorGatewayOptions = {}
): ConnectorGatewayComposition {
  const repository = options.repository ?? new InMemoryConnectorRegistryRepository();
  const execution = options.execution ?? new PendingConnectorExecutionPort();

  const registry = new ConnectorRegistry(repository);
  const health = new ConnectorHealthService(repository);
  const resolver = new ConnectorResolver(registry, health);
  const directory = new ConnectorDirectory(repository, health);
  const gateway = new ConnectorGatewayService(registry, resolver, health, directory, execution);

  return {
    repository,
    registry,
    resolver,
    health,
    directory,
    gateway,
    createRemotePrintConnectorPort(printResultPort: PrintResultPort) {
      return new RemotePrintConnectorPort(gateway, printResultPort);
    },
  };
}

export const connectorGatewayComposition = composeConnectorGateway();

export const connectorGateway = connectorGatewayComposition.gateway;
