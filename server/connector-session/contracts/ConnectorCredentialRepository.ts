import type { ConnectorCredentialRecord } from "./sessionContracts";

export interface ConnectorCredentialRepository {
  save(record: ConnectorCredentialRecord): Promise<void>;
  findById(credentialId: string): Promise<ConnectorCredentialRecord | null>;
  findActiveByRestaurant(restaurantId: number): Promise<ConnectorCredentialRecord[]>;
  revoke(credentialId: string, revokedAt: string): Promise<boolean>;
}
