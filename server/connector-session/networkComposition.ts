import { ConnectorDirectory } from "../connector-gateway/services/ConnectorDirectory";
import { ConnectorGatewayService } from "../connector-gateway/services/ConnectorGatewayService";
import { ConnectorHealthService } from "../connector-gateway/services/ConnectorHealthService";
import { ConnectorRegistry } from "../connector-gateway/services/ConnectorRegistry";
import { ConnectorResolver } from "../connector-gateway/services/ConnectorResolver";
import type { ConnectorRegistryRepository } from "../connector-gateway/contracts/ConnectorRegistryRepository";
import { InMemoryConnectorRegistryRepository } from "../connector-gateway/infrastructure/InMemoryConnectorRegistryRepository";
import { RemotePrintConnectorPort } from "../connector-gateway/adapters/RemotePrintConnectorPort";
import type { PrintResultPort } from "../printing/contracts/ports/PrintResultPort";
import { SessionConnectorExecutionPort } from "./adapters/SessionConnectorExecutionPort";
import type { ConnectorCredentialRepository } from "./contracts/ConnectorCredentialRepository";
import type { ConnectorPairingRepository } from "./contracts/ConnectorPairingRepository";
import type { ConnectorSessionRepository } from "./contracts/ConnectorSessionRepository";
import type {
  ConnectorTransportConnection,
  ConnectorTransportRegistry,
} from "./contracts/ConnectorTransportPort";
import { InMemoryConnectorCredentialRepository } from "./infrastructure/InMemoryConnectorCredentialRepository";
import { InMemoryConnectorPairingRepository } from "./infrastructure/InMemoryConnectorPairingRepository";
import { InMemoryConnectorSessionRepository } from "./infrastructure/InMemoryConnectorSessionRepository";
import { InMemoryConnectorTransportRegistry } from "./infrastructure/InMemoryConnectorTransportRegistry";
import { ConnectorAuthenticationService } from "./services/ConnectorAuthenticationService";
import { ConnectorCommandRouter } from "./services/ConnectorCommandRouter";
import { ConnectorHeartbeatProtocol } from "./services/ConnectorHeartbeatProtocol";
import { ConnectorReconnectPolicy } from "./services/ConnectorReconnectPolicy";
import { ConnectorRegistrationProtocol } from "./services/ConnectorRegistrationProtocol";
import { ConnectorResponseRouter } from "./services/ConnectorResponseRouter";
import { ConnectorSessionManager } from "./services/ConnectorSessionManager";
import { ConnectorSessionTransportHandler } from "./services/ConnectorSessionTransportHandler";

export type ConnectorSessionComposition = {
  sessionRepository: ConnectorSessionRepository;
  credentialRepository: ConnectorCredentialRepository;
  pairingRepository: ConnectorPairingRepository;
  transportRegistry: ConnectorTransportRegistry;
  authService: ConnectorAuthenticationService;
  sessionManager: ConnectorSessionManager;
  registrationProtocol: ConnectorRegistrationProtocol;
  heartbeatProtocol: ConnectorHeartbeatProtocol;
  commandRouter: ConnectorCommandRouter;
  responseRouter: ConnectorResponseRouter;
  transportHandler: ConnectorSessionTransportHandler;
  reconnectPolicy: ConnectorReconnectPolicy;
  executionPort: SessionConnectorExecutionPort;
  acceptConnection(connection: ConnectorTransportConnection): void;
};

export type ConnectorNetworkComposition = {
  session: ConnectorSessionComposition;
  gateway: ReturnType<typeof buildGatewayComposition>;
};

export type ComposeConnectorNetworkOptions = {
  registryRepository?: ConnectorRegistryRepository;
};

function buildGatewayComposition(
  repository: ConnectorRegistryRepository,
  executionPort: SessionConnectorExecutionPort
) {
  const registry = new ConnectorRegistry(repository);
  const health = new ConnectorHealthService(repository);
  const resolver = new ConnectorResolver(registry, health);
  const directory = new ConnectorDirectory(repository, health);
  const gateway = new ConnectorGatewayService(registry, resolver, health, directory, executionPort);

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

export function composeConnectorNetwork(
  options: ComposeConnectorNetworkOptions = {}
): ConnectorNetworkComposition {
  const repository = options.registryRepository ?? new InMemoryConnectorRegistryRepository();
  const sessionRepository = new InMemoryConnectorSessionRepository();
  const credentialRepository = new InMemoryConnectorCredentialRepository();
  const pairingRepository = new InMemoryConnectorPairingRepository();
  const transportRegistry = new InMemoryConnectorTransportRegistry();

  const sessionManager = new ConnectorSessionManager(sessionRepository, transportRegistry);
  const responseRouter = new ConnectorResponseRouter();
  const commandRouter = new ConnectorCommandRouter(transportRegistry, responseRouter);
  const executionPort = new SessionConnectorExecutionPort(sessionManager, commandRouter);

  const gateway = buildGatewayComposition(repository, executionPort);

  const authService = new ConnectorAuthenticationService(pairingRepository, credentialRepository);
  const registrationProtocol = new ConnectorRegistrationProtocol(gateway.gateway, sessionManager);
  const heartbeatProtocol = new ConnectorHeartbeatProtocol(gateway.gateway, sessionManager);
  const transportHandler = new ConnectorSessionTransportHandler(
    authService,
    sessionManager,
    registrationProtocol,
    heartbeatProtocol,
    responseRouter
  );

  const session: ConnectorSessionComposition = {
    sessionRepository,
    credentialRepository,
    pairingRepository,
    transportRegistry,
    authService,
    sessionManager,
    registrationProtocol,
    heartbeatProtocol,
    commandRouter,
    responseRouter,
    transportHandler,
    reconnectPolicy: new ConnectorReconnectPolicy(),
    executionPort,
    acceptConnection(connection: ConnectorTransportConnection) {
      transportRegistry.track(connection);
      transportHandler.attach(connection);
    },
  };

  return { session, gateway };
}

export const connectorNetworkComposition = composeConnectorNetwork();
