import type { ConnectorSession } from "../contracts/gatewayContracts";
import type { ConnectorRegistryRepository } from "../contracts/ConnectorRegistryRepository";

/**
 * In-process registry for PRINT-GATEWAY-1.
 * Replaced by durable repository when gateway persistence program lands.
 */
export class InMemoryConnectorRegistryRepository implements ConnectorRegistryRepository {
  private readonly byRestaurant = new Map<number, ConnectorSession>();
  private readonly byInstance = new Map<string, ConnectorSession>();

  async save(session: ConnectorSession): Promise<void> {
    this.byRestaurant.set(session.identity.restaurantId, session);
    this.byInstance.set(session.identity.connectorInstanceId, session);
  }

  async findByRestaurant(restaurantId: number): Promise<ConnectorSession | null> {
    return this.byRestaurant.get(restaurantId) ?? null;
  }

  async findByInstance(connectorInstanceId: string): Promise<ConnectorSession | null> {
    return this.byInstance.get(connectorInstanceId) ?? null;
  }

  async listAll(): Promise<ConnectorSession[]> {
    return Array.from(this.byRestaurant.values());
  }

  async remove(restaurantId: number, connectorInstanceId: string): Promise<boolean> {
    const current = this.byRestaurant.get(restaurantId);
    if (!current || current.identity.connectorInstanceId !== connectorInstanceId) {
      return false;
    }
    this.byRestaurant.delete(restaurantId);
    this.byInstance.delete(connectorInstanceId);
    return true;
  }
}
