import type { ConnectorSession } from "./gatewayContracts";

export interface ConnectorRegistryRepository {
  save(session: ConnectorSession): Promise<void>;
  findByRestaurant(restaurantId: number): Promise<ConnectorSession | null>;
  findByInstance(connectorInstanceId: string): Promise<ConnectorSession | null>;
  listAll(): Promise<ConnectorSession[]>;
  remove(restaurantId: number, connectorInstanceId: string): Promise<boolean>;
}
