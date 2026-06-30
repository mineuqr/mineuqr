import type {
  ConnectorRegistrationCommand,
  ConnectorRegistrationResult,
  ConnectorSession,
  ConnectorStatus,
} from "../contracts/gatewayContracts";
import type { ConnectorRegistryRepository } from "../contracts/ConnectorRegistryRepository";

function initialStatus(): ConnectorStatus {
  return {
    availability: "online",
    isRegistered: true,
    isHealthy: true,
    lastSeenAt: new Date().toISOString(),
    message: null,
  };
}

/**
 * Canonical connector registration and session persistence.
 */
export class ConnectorRegistry {
  constructor(private readonly repository: ConnectorRegistryRepository) {}

  async register(command: ConnectorRegistrationCommand): Promise<ConnectorRegistrationResult> {
    const registeredAt = new Date().toISOString();
    const identity = {
      restaurantId: command.restaurantId,
      connectorInstanceId: command.connectorInstanceId,
      deploymentTarget: command.deploymentTarget,
    };

    const session: ConnectorSession = {
      identity,
      metadata: command.metadata,
      capabilities: command.capabilities,
      runtime: {
        identity,
        endpoint: command.endpoint,
        registeredAt,
        lastHeartbeatAt: registeredAt,
      },
      status: initialStatus(),
    };

    await this.repository.save(session);

    return { identity, session, registeredAt };
  }

  async getSession(restaurantId: number): Promise<ConnectorSession | null> {
    return this.repository.findByRestaurant(restaurantId);
  }

  async getSessionByInstance(connectorInstanceId: string): Promise<ConnectorSession | null> {
    return this.repository.findByInstance(connectorInstanceId);
  }

  async unregister(restaurantId: number, connectorInstanceId: string): Promise<boolean> {
    return this.repository.remove(restaurantId, connectorInstanceId);
  }
}
