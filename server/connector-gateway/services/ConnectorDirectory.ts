import type { ConnectorHealth, ConnectorSession } from "../contracts/gatewayContracts";
import type { ConnectorRegistryRepository } from "../contracts/ConnectorRegistryRepository";
import type { ConnectorHealthService } from "./ConnectorHealthService";

/**
 * Read-only directory of registered connectors and health snapshots.
 */
export class ConnectorDirectory {
  constructor(
    private readonly repository: ConnectorRegistryRepository,
    private readonly health: ConnectorHealthService
  ) {}

  async listSessions(): Promise<ConnectorSession[]> {
    return this.repository.listAll();
  }

  async getHealthForRestaurant(restaurantId: number): Promise<ConnectorHealth | null> {
    const session = await this.repository.findByRestaurant(restaurantId);
    if (!session) return null;
    return this.health.evaluate(session);
  }
}
