import { ConnectorReconnectPolicy } from "../../connector-session/services/ConnectorReconnectPolicy";
import type { ConnectorCommandHandler } from "../contracts/ConnectorCommandHandler";
import type { GatewayTransportFactory } from "../contracts/GatewayTransportPort";
import type { LocalConnectorConfigProvider } from "../contracts/LocalConnectorConfig";
import { ConnectorSessionClient } from "./ConnectorSessionClient";
import { GatewayConnectionClient } from "./GatewayConnectionClient";
import { LocalConnectorHost } from "./LocalConnectorHost";
import { buildRuntimeIdentity } from "./RuntimeIdentityBuilder";

export type LocalConnectorBootstrapResult = {
  host: LocalConnectorHost;
  sessionClient: ConnectorSessionClient;
  gatewayClient: GatewayConnectionClient;
};

/**
 * Canonical RLC bootstrap: config → identity → gateway auth → register → healthy → ready.
 */
export class LocalConnectorBootstrap {
  constructor(
    private readonly configProvider: LocalConnectorConfigProvider,
    private readonly transportFactory: GatewayTransportFactory,
    private readonly commandHandler: ConnectorCommandHandler,
    private readonly reconnectPolicy: ConnectorReconnectPolicy = new ConnectorReconnectPolicy()
  ) {}

  createHost(): LocalConnectorHost {
    return new LocalConnectorHost();
  }

  async start(host: LocalConnectorHost): Promise<LocalConnectorBootstrapResult> {
    const config = this.configProvider.load();
    const identity = buildRuntimeIdentity(config);
    host.beginStart(config, identity);

    const gatewayClient = new GatewayConnectionClient(this.transportFactory);
    const sessionClient = new ConnectorSessionClient(config, identity, this.commandHandler);

    host.setLifecycle("connecting");
    const transport = await gatewayClient.open();
    host.setGatewayConnected(true, transport.connectionId);
    await sessionClient.connect(transport);

    host.setLifecycle("authenticating");
    const auth = await sessionClient.authenticate();
    if (!auth.success || !auth.sessionId) {
      host.setLifecycle("stopped");
      throw new Error(auth.message ?? "authentication_failed");
    }
    host.markAuthenticated(new Date().toISOString());
    host.setSessionId(auth.sessionId);

    const registration = await sessionClient.register(auth.sessionId);
    if (!registration.success) {
      host.setLifecycle("stopped");
      throw new Error(registration.message ?? "registration_failed");
    }
    host.markRegistered(new Date().toISOString());

    const heartbeat = await sessionClient.sendHeartbeat();
    const lifecycle = heartbeat.success && heartbeat.lifecycle === "healthy" ? "healthy" : "registered";
    host.markHeartbeat(new Date().toISOString(), lifecycle);

    sessionClient.startHeartbeat((result) => {
      if (result.success && result.lifecycle === "healthy") {
        host.markHeartbeat(new Date().toISOString(), "healthy");
      } else if (result.lifecycle === "degraded") {
        host.setLifecycle("degraded");
      }
    });
    sessionClient.markRunning();

    return { host, sessionClient, gatewayClient };
  }

  async stop(result: LocalConnectorBootstrapResult): Promise<void> {
    result.host.beginStop();
    await result.sessionClient.disconnect();
    await result.gatewayClient.close();
    result.host.markStopped();
  }

  getReconnectPolicy(): ConnectorReconnectPolicy {
    return this.reconnectPolicy;
  }
}
